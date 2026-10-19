import AppleAuthButton from '@/components/auth/AppleAuthButton';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import PressableScale from '@/components/ui/PressableScale';
import { createThemedStyles, Fonts, useThemeColors } from '@/constants/theme';
import useAuthStore from '@/hooks/use-auth-store';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import Ionic from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

const Page = () => {
  const { signInWithOAuth, signInAnonymously } = useAuthStore();
  const [isContinuingAsGuest, setIsContinuingAsGuest] = useState(false);

  const router=useRouter() ;
  const colors = useThemeColors();
  const styles = useStyles();

  const handleOAuth = async (provider: 'apple' | 'google' | 'facebook') => {
    const { error } = await signInWithOAuth(provider);
    if (error) Alert.alert('Sign-in unavailable', error);
  };

  const continueAsGuest = async () => {
    setIsContinuingAsGuest(true);
    const { error } = await signInAnonymously();
    setIsContinuingAsGuest(false);
    if (error) Alert.alert('Could not continue as guest', error);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.dismiss()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={6}>
          <Ionic name='close' size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.title} accessibilityRole="header">Your ENJOY account</Text>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.buttonContainer}>
                <Animated.View entering={FadeInDown.delay(100)} style={styles.buttonItem}>
                  <AppleAuthButton onPress={() => handleOAuth('apple')} />
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(200)} style={styles.buttonItem}>
                  <GoogleAuthButton onPress={() => handleOAuth('google')} />
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(300)} style={styles.buttonItem}>
                  <PressableScale style={styles.facebookButton} onPress={() => handleOAuth('facebook')} accessibilityRole="button">
                       <FontAwesome5 name='facebook' size={20} color={colors.textPrimary} ></FontAwesome5>
                        <Text style={styles.facebookButtonText}>Continue with Facebook</Text>
                      </PressableScale>
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(350)} style={styles.buttonItem}>
                  <PressableScale style={styles.emailButton} onPress={() => router.push('/email-auth')} accessibilityRole="button">
                       <Ionic name='mail-outline' size={20} color={colors.textPrimary} ></Ionic>
                        <Text style={styles.facebookButtonText}>Continue with email</Text>
                      </PressableScale>
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(400)} style={styles.buttonItem}>
                  <PressableScale
                    style={styles.otherButton}
                    onPress={continueAsGuest}
                    disabled={isContinuingAsGuest}
                    accessibilityRole="button"
                    accessibilityLabel="Continue as guest"
                    accessibilityState={{ disabled: isContinuingAsGuest, busy: isContinuingAsGuest }}>
                        {isContinuingAsGuest ? (
                          <ActivityIndicator color={colors.primary} />
                        ) : (
                          <Text style={styles.otherButtonText}>Continue as guest</Text>
                        )}
                      </PressableScale>
                </Animated.View>

              </ScrollView>
    </SafeAreaView>
  )
}

export default Page

const useStyles = createThemedStyles((c) => ({

container:{
  flex:1,
  paddingHorizontal:16,
  paddingTop: 14,
  backgroundColor: c.background,
},
headerRow: {
  width: '100%',
  alignItems: 'flex-end',
  marginBottom: 8,
},
closeBtn: {
  backgroundColor: c.surfaceMuted,
  borderRadius: 40,
  padding: 8,
},

title:{
  fontSize:30,
  color:c.textPrimary,
  fontFamily:Fonts.brandBlack,
  marginTop: 0,
  marginBottom: 20,
  lineHeight: 36,
},
 scrollView: {
   flex: 1,
   width: '100%',
 },
 buttonContainer:{
    width:'100%',
    gap:12,
    alignItems:'center',
    alignSelf:'center',
    maxWidth: 360,
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingBottom: 8,
  },
  buttonItem:{
    width:'100%',
  },

      otherButton:{
      width:'100%',
      minHeight:52,
      flexDirection:'row',
      alignItems:'center',
      justifyContent:'center',
      paddingVertical:15,
      paddingHorizontal:14,
      borderRadius:14,
      gap:4
      },
      otherButtonText:{
        color:c.primaryText,
        fontSize:18,
        fontFamily:Fonts.brandBold
      },

     facebookButton:{
      width:'100%',
      backgroundColor:c.surface,
      borderWidth:1,
      borderColor:c.border,
      minHeight:52,
      flexDirection:'row',
      alignItems:'center',
      justifyContent:'center',
      paddingVertical:15,
      paddingHorizontal:14,
      borderRadius:14,
      gap:4
     },
     facebookButtonText:{
       color:c.textPrimary,
       fontSize:18,
       fontFamily:Fonts.brandBold
     },
     emailButton:{
      width:'100%',
      backgroundColor:c.surface,
      borderWidth:1,
      borderColor:c.border,
      minHeight:52,
      flexDirection:'row',
      alignItems:'center',
      justifyContent:'center',
      paddingVertical:15,
      paddingHorizontal:14,
      borderRadius:14,
      gap:5
     }

}))
