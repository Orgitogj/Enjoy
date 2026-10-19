import AppleAuthButton from "@/components/auth/AppleAuthButton";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import EnjoyLogo from "@/components/brand/EnjoyLogo";
import SmoothInfiniteScroll from "@/components/SmoothInfiniteScroll";
import PressableScale from "@/components/ui/PressableScale";
import { createThemedStyles, Fonts, useThemeColors } from "@/constants/theme";
import useAuthStore from "@/hooks/use-auth-store";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from "expo-router";
import {
    Alert,
    Text,
    View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Index() {
  const { signInWithOAuth } = useAuthStore();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useStyles();
  const reduceMotion = useReduceMotion();
  const enter = (delay: number) =>
    reduceMotion ? FadeIn.duration(200) : FadeInDown.delay(delay).duration(380);

  const handleOAuth = async (provider: 'apple' | 'google') => {
    const { error } = await signInWithOAuth(provider);
    if (error) Alert.alert('Sign-in unavailable', error);
  };

  const showPrivacyStatement = () => {
    Alert.alert(
      'Privacy statement',
      'ENJOY is a demo app built on Supabase. No real personal data is processed.'
    );
  };
  return (
    <View style={styles.container}>
      <View style={styles.infiniteScrollContainer}>
        <View>
          <SmoothInfiniteScroll scrollDirection="down" iconSet="set1" />
        </View>
        <View>
          <SmoothInfiniteScroll scrollDirection="up" iconSet="set2" />
        </View>
        <View>
          <SmoothInfiniteScroll scrollDirection="down" iconSet="set3" />
        </View>

        <LinearGradient
          colors={[`${colors.background}00`, colors.background]}
          style={{ position: 'absolute', height: 200, left: 0, bottom: 0, right: 0 }}
        />
      </View>

      <View style={[styles.contentContainer, { paddingBottom: insets.bottom + 20 }]}>
        <Animated.View entering={enter(0)} style={styles.brand}>
          <EnjoyLogo size={44} />
          <Text style={styles.tagLine}>Good food. Better moments.</Text>
        </Animated.View>

        <View style={styles.buttonContainer}>
          <Animated.View entering={enter(100)} style={styles.buttonItem}>
            <AppleAuthButton onPress={() => handleOAuth('apple')} />
          </Animated.View>
          <Animated.View entering={enter(180)} style={styles.buttonItem}>
            <GoogleAuthButton onPress={() => handleOAuth('google')} />
          </Animated.View>

          <Animated.View entering={enter(260)} style={styles.buttonItem}>
            <Link href='/other-options' style={{textDecorationLine:'none'}} asChild>
              <PressableScale style={styles.otherButton} accessibilityRole="button">
                <Text style={styles.otherButtonText}>Other options</Text>
              </PressableScale>
            </Link>
          </Animated.View>
        </View>

        <Animated.View style={styles.privacyContainer} entering={enter(340)}>
          <Text style={styles.privacyText}>
            Please visit the {''}
            <Text style={styles.privacyLink} onPress={showPrivacyStatement} accessibilityRole="link">
              ENJOY privacy statement
            </Text>{' '}
            to learn how your personal data is handled.
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const useStyles = createThemedStyles((c) => ({

  container:{
    flex: 1,
    backgroundColor: c.background,
  },

  contentContainer:{
    alignItems:'center',
    paddingHorizontal:30,
    paddingTop:8,
  },

  infiniteScrollContainer:{
      flex:1,
      flexDirection:'row',
      justifyContent:'center',
      alignItems:'center',
      gap:4,
      position:'relative',
      overflow:'hidden',
  },

  brand:{
    alignItems:'center',
    marginBottom:24,
    gap:6,
  },
  tagLine:{
    fontSize:22,
    fontFamily:Fonts.brandBold,
    color:c.textSecondary,
    textAlign:'center',
    lineHeight:28,
  },
  buttonContainer:{
    width:'100%',
    gap:12,
    alignItems:'center',
    alignSelf:'center',
    maxWidth: 360,
  },

      otherButton:{
      width:'100%',
      minHeight:52,
      backgroundColor:c.surface,
      borderWidth:1,
      borderColor:c.border,
      flexDirection:'row',
      alignItems:'center',
      justifyContent:'center',
      paddingVertical:15,
      paddingHorizontal:14,
      borderRadius:14,
      gap:4
      },
      buttonItem:{
        width:'100%',
      },
      otherButtonText:{
        color:c.textPrimary,
        fontSize:18,
        fontFamily:Fonts.brandBold,
      },
      privacyContainer:{
            marginTop:10,
            paddingHorizontal:20,
      },
      privacyText:{
        fontSize:12,
        color:c.textMuted,
        textAlign:'center',
        lineHeight:18,
      },
      privacyLink:{
        color:c.link,
        textDecorationLine:'underline'
      }

}))
