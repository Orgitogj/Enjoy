import { useThemeColors } from '@/constants/theme';
import { Stack } from 'expo-router';

const Layout = () => {
  const colors = useThemeColors();
  return (
    <Stack>
      <Stack.Screen name='index' options={{headerShown:false,contentStyle:{backgroundColor:colors.background}}}/>
      <Stack.Screen name='other-options' options={{headerShown:false,
      presentation:'formSheet',
      title:'',
      headerShadowVisible:false,
      sheetAllowedDetents:[0.56],
      sheetCornerRadius:16,
      }}/>
      <Stack.Screen name='email-auth' options={{headerShown:false,
      presentation:'formSheet',
      title:'',
      headerShadowVisible:false,
      sheetAllowedDetents:[0.2],
      sheetCornerRadius:16,
      }}/>
      </Stack>
  )
}

export default Layout;
