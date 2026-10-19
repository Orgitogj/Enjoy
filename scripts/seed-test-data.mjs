import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars before running this script.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DAY_MS = 24 * 60 * 60 * 1000;

const OFFERS = [
  {
    code: 'WELCOME20',
    description: '20% off your first order, up to €5',
    discount_type: 'percentage',
    discount_value: 20,
    max_discount: 5,
    max_per_customer: 1,
  },
  {
    code: 'SAVE5',
    description: '€5 off orders over €20',
    discount_type: 'fixed',
    discount_value: 5,
    min_subtotal: 20,
    max_per_customer: 3,
  },
  {
    code: 'BIGORDER',
    description: '25% off orders over €40, up to €15',
    discount_type: 'percentage',
    discount_value: 25,
    max_discount: 15,
    min_subtotal: 40,
    max_per_customer: 5,
  },
  {
    code: 'PIZZA15',
    description: '15% off at Pizza Perfetto',
    discount_type: 'percentage',
    discount_value: 15,
    restaurant: 'Pizza Perfetto',
    max_per_customer: 5,
  },
  {
    code: 'FIRSTONE',
    description: '€3 off — only the very first customer to use it',
    discount_type: 'fixed',
    discount_value: 3,
    max_redemptions: 1,
    max_per_customer: 1,
  },
  {
    code: 'WEEKEND10',
    description: '10% off this weekend only',
    discount_type: 'percentage',
    discount_value: 10,
    ends_in_days: 3,
    max_per_customer: 5,
  },
];

async function findUserByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (error) throw new Error(`Could not list users: ${error.message}`);
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
}

async function requireUser(email, envName) {
  if (!email) {
    console.log(`${envName} not set - skipping.`);
    return null;
  }
  const user = await findUserByEmail(email);
  if (!user) {
    console.warn(`No account found for ${email}. Sign up in the app first, then re-run.`);
    return null;
  }
  return { email, user };
}

async function promoteAdmin() {
  const found = await requireUser(process.env.SEED_ADMIN_EMAIL, 'SEED_ADMIN_EMAIL');
  if (!found) return;
  const { error } = await supabase.from('profiles').update({ role: 'admin' }).eq('id', found.user.id);
  if (error) throw new Error(`Could not promote admin: ${error.message}`);
  console.log(`Admin: ${found.email}`);
}

async function linkMerchant() {
  const found = await requireUser(process.env.SEED_MERCHANT_EMAIL, 'SEED_MERCHANT_EMAIL');
  if (!found) return;
  const { data: restaurants, error: listError } = await supabase.from('restaurants').select('id');
  if (listError) throw new Error(`Could not list restaurants: ${listError.message}`);

  const rows = restaurants.map((r) => ({ restaurant_id: r.id, user_id: found.user.id, role: 'owner' }));
  const { error } = await supabase.from('restaurant_members').upsert(rows);
  if (error) throw new Error(`Could not link merchant: ${error.message}`);
  console.log(`Merchant: ${found.email} owns ${rows.length} restaurants`);
}

async function approveCourier() {
  const found = await requireUser(process.env.SEED_COURIER_EMAIL, 'SEED_COURIER_EMAIL');
  if (!found) return;
  const { user, email } = found;

  const { data: existing } = await supabase.from('couriers').select('id').eq('id', user.id).maybeSingle();
  if (!existing) {
    const { error } = await supabase.from('couriers').insert({
      id: user.id,
      full_name: email.split('@')[0],
      vehicle_type: 'scooter',
    });
    if (error) throw new Error(`Could not create courier: ${error.message}`);
  }

  const { error } = await supabase.from('couriers').update({ verification_status: 'approved' }).eq('id', user.id);
  if (error) throw new Error(`Could not approve courier: ${error.message}`);

  const { error: roleError } = await supabase.from('profiles').update({ role: 'courier' }).eq('id', user.id);
  if (roleError) throw new Error(`Could not set courier role: ${roleError.message}`);
  console.log(`Courier: ${email} (approved, starts offline)`);
}

async function seedOffers() {
  const { data: existing, error } = await supabase.from('promotions').select('code');
  if (error) throw new Error(`Could not read promotions: ${error.message}`);
  const existingCodes = new Set(existing.map((p) => p.code.toUpperCase()));

  const { data: restaurants } = await supabase.from('restaurants').select('id, name');
  const restaurantId = (name) => restaurants.find((r) => r.name === name)?.id ?? null;

  for (const { restaurant, ends_in_days, ...offer } of OFFERS) {
    if (existingCodes.has(offer.code)) {
      console.log(`Offer ${offer.code} already exists - left unchanged`);
      continue;
    }
    if (restaurant && !restaurantId(restaurant)) {
      console.warn(`Restaurant "${restaurant}" not found - skipping ${offer.code}`);
      continue;
    }
    const { error: insertError } = await supabase.from('promotions').insert({
      ...offer,
      restaurant_id: restaurant ? restaurantId(restaurant) : null,
      ends_at: ends_in_days ? new Date(Date.now() + ends_in_days * DAY_MS).toISOString() : null,
    });
    if (insertError) throw new Error(`Could not add ${offer.code}: ${insertError.message}`);
    console.log(`Offer ${offer.code}: ${offer.description}`);
  }
}

async function main() {
  await promoteAdmin();
  await linkMerchant();
  await approveCourier();
  await seedOffers();
  console.log('Test data ready.');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
