import AppearancePicker from '@/components/settings/AppearancePicker';
import { createThemedStyles, useThemeColors } from '@/constants/theme';
import useAuthStore from '@/hooks/use-auth-store';
import { useFavorites } from '@/hooks/useFavorites';
import { useCourierProfile } from '@/hooks/useCourier';
import { useNotifications } from '@/hooks/useNotifications';
import { useManagedRestaurants } from '@/hooks/useMerchant';
import { useOrderHistory } from '@/hooks/useOrderHistory';
import { useProfile } from '@/hooks/useProfile';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Linking,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const Page = () => {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const { signOut, user, isAnonymous } = useAuthStore();
  const { favorites } = useFavorites();
  const { data: orders } = useOrderHistory();
  const { profile, updateProfile } = useProfile();
  const { restaurants: managedRestaurants, isMerchant } = useManagedRestaurants();
  const { courier, isCourier } = useCourierProfile();
  const { unreadCount } = useNotifications();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
  }, [profile]);

  const onLogout = async () => {
    setIsSigningOut(true);
    const { error } = await signOut();
    setIsSigningOut(false);
    if (error) {
      Alert.alert('Could not sign out', 'Please check your connection and try again.');
    }
  };

  const onInviteFriends = () => {
    Share.share({ message: 'Check out this food delivery app!' });
  };

  const onContactSupport = () => {
    Linking.openURL('mailto:support@example.com?subject=ENJOY%20support');
  };

  const onSaveProfile = async () => {
    await updateProfile({ full_name: fullName.trim(), phone: phone.trim() });
    setIsEditingProfile(false);
  };

  const recentOrders = (orders ?? []).slice(0, 3);
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic">

      <View style={styles.section}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuItemTitle}>{profile?.full_name || 'Your profile'}</Text>
            <Text style={styles.menuItemSubtitle}>
              {isAnonymous ? 'Browsing as guest' : user?.email}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel={
              unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
            }
            hitSlop={8}>
            <Ionicons name="notifications-outline" size={22} color={colors.primary} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsEditingProfile((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={isEditingProfile ? 'Stop editing your profile' : 'Edit your profile'}
            accessibilityState={{ selected: isEditingProfile }}
            hitSlop={12}>
            <Ionicons name={isEditingProfile ? 'close' : 'pencil'} size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {isEditingProfile && (
          <View style={styles.profileForm}>
            <TextInput
              style={styles.profileInput}
              placeholder="Full name"
              placeholderTextColor={colors.textPrimary}
              value={fullName}
              onChangeText={setFullName}
            />
            <TextInput
              style={styles.profileInput}
              placeholder="Phone number"
              placeholderTextColor={colors.textPrimary}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <TouchableOpacity style={styles.saveProfileButton} onPress={onSaveProfile}>
              <Text style={styles.saveProfileButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {profile?.role === 'admin' && (
        <View style={styles.section}>
          <TouchableOpacity style={styles.merchantCard} onPress={() => router.push('/admin')}>
            <View style={styles.merchantIcon}>
              <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuItemTitle}>Admin console</Text>
              <Text style={styles.menuItemSubtitle}>Orders, couriers, people and settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {isMerchant && (
        <View style={styles.section}>
          <TouchableOpacity style={styles.merchantCard} onPress={() => router.push('/merchant')}>
            <View style={styles.merchantIcon}>
              <Ionicons name="storefront" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuItemTitle}>Restaurant dashboard</Text>
              <Text style={styles.menuItemSubtitle}>
                {managedRestaurants.length === 1
                  ? managedRestaurants[0].name
                  : `${managedRestaurants.length} restaurants`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <TouchableOpacity style={styles.merchantCard} onPress={() => router.push('/courier')}>
          <View style={styles.merchantIcon}>
            <Ionicons name="bicycle" size={20} color={colors.primary} />
          </View>
          <View style={styles.menuItemLeft}>
            <Text style={styles.menuItemTitle}>
              {isCourier ? 'Courier dashboard' : 'Deliver with us'}
            </Text>
            <Text style={styles.menuItemSubtitle}>
              {isCourier
                ? courier?.verification_status === 'approved'
                  ? 'Go online and take deliveries'
                  : 'Application under review'
                : 'Earn money delivering orders'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/order/history')}>
          <View style={styles.menuItemLeft}>
            <Text style={styles.menuItemTitle}>Order history</Text>
            <Text style={styles.menuItemSubtitle}>
              {recentOrders.length > 0
                ? `${recentOrders.length} recent order${recentOrders.length > 1 ? 's' : ''} • Reorder anytime`
                : 'No orders yet • Start your first order'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/order/support-tickets')}
          testID="profile-support-tickets">
          <View style={styles.menuItemLeft}>
            <Text style={styles.menuItemTitle}>Help with an order</Text>
            <Text style={styles.menuItemSubtitle}>See the problems you reported</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your favorites</Text>
        {favorites.length === 0 ? (
          <View style={styles.favoritesCard}>
            <Text style={styles.favoritesText}>
              Add a restaurant to your favorites by tapping the heart icon in the restaurant view.
            </Text>
            <View style={styles.favoritesIllustration}>
              <View style={styles.storeIcon}>
                <View style={styles.awning} />
                <View style={styles.storeFront} />
                <View style={styles.storeBase} />
              </View>
              <View style={styles.heartIcon}>
                <Ionicons name="heart" size={24} color={colors.danger} />
              </View>
            </View>
          </View>
        ) : (
          favorites.map((restaurant) => (
            <TouchableOpacity
              key={restaurant.id}
              style={styles.favoriteItem}
              onPress={() => router.push(`/(modal)/(restaurant)/${restaurant.id}`)}>
              <View style={styles.favoriteRow}>
                <View style={styles.favoriteTextContainer}>
                  <Text style={styles.favoriteName}>{restaurant.name}</Text>
                  <Text style={styles.favoriteMeta}>{restaurant.cuisines.join(' • ')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {recentOrders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent orders</Text>
          {recentOrders.map((order) => (
            <View key={order.id} style={styles.orderItem}>
              <View style={styles.orderInfo}>
                <Text style={styles.orderName}>{order.restaurant?.name ?? 'Restaurant'}</Text>
                <Text style={styles.orderMeta}>
                  {order.delivery_mode === 'pickup' ? 'Pickup' : 'Delivery'} •{' '}
                  {new Date(order.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.orderAmount}>{order.total.toFixed(2)} €</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Appearance
        </Text>
        <AppearancePicker />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick links</Text>

        <TouchableOpacity style={styles.linkItem} onPress={onInviteFriends}>
          <Text style={styles.linkText}>Invite friends</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.separator} />

        <TouchableOpacity style={styles.linkItem} onPress={onContactSupport}>
          <Text style={styles.linkText}>Contact Support</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={onLogout}
        disabled={isSigningOut}
        accessibilityRole="button"
        accessibilityState={{ disabled: isSigningOut }}>
        <Text style={styles.logoutButtonText}>
          {isSigningOut ? 'Signing out...' : 'Sign out'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const useStyles = createThemedStyles((c) => ({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  section: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.selectedBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileForm: {
    gap: 8,
    paddingBottom: 12,
  },
  profileInput: {
    borderWidth: 1,
    borderColor: c.textPrimary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: c.textPrimary,
  },
  saveProfileButton: {
    alignSelf: 'flex-start',
    backgroundColor: c.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveProfileButtonText: {
    color: c.primaryForeground,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: c.textPrimary,
    paddingVertical: 16,
  },
  bellButton: { padding: 4, marginRight: 8 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: c.dangerSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: c.primaryForeground, fontSize: 10, fontWeight: '700' },
  merchantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: c.selectedBackground,
    borderRadius: 12,
    padding: 14,
  },
  merchantIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  menuItemLeft: {
    flex: 1,
  },
  menuItemTitle: {
    color: c.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: c.textMuted,
  },
  separator: {
    height: 1,
    backgroundColor: c.surfaceMuted,
  },
  favoritesCard: {
    flexDirection: 'row',
    paddingVertical: 20,
    gap: 16,
  },
  favoriteItem: {
    backgroundColor: c.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  favoriteTextContainer: {
    flex: 1,
  },
  favoriteName: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
  },
  favoriteMeta: {
    fontSize: 13,
    color: c.textMuted,
    marginTop: 4,
  },
  favoritesText: {
    flex: 1,
    fontSize: 14,
    color: c.textMuted,
    lineHeight: 20,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  orderInfo: {
    flex: 1,
  },
  orderName: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
  },
  orderMeta: {
    fontSize: 13,
    color: c.textMuted,
    marginTop: 4,
  },
  orderAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: c.primaryText,
  },
  favoritesIllustration: {
    width: 80,
    height: 80,
  },
  storeIcon: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  awning: {
    width: 60,
    height: 20,
    backgroundColor: c.primary,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    position: 'absolute',
    top: 10,
  },
  storeFront: {
    width: 60,
    height: 40,
    backgroundColor: c.surfaceMuted,
    position: 'absolute',
    top: 30,
  },
  storeBase: {
    width: 60,
    height: 8,
    backgroundColor: c.surfaceMuted,
    position: 'absolute',
    bottom: 12,
  },
  heartIcon: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: c.surface,
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 2px -2px rgba(0, 0, 0, 0.1)',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
  logoutButton: {
    backgroundColor: c.dangerSoft,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.danger,
  },
}));

export default Page;
