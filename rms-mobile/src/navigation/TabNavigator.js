import React, { useRef, useCallback, createContext, useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, Animated, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';


// ── Screens ────────────────────────────────────────────────────────────────
import DashboardScreen from '../screens/employer/DashboardScreen';
import MenuScreen from '../screens/shared/MenuScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

// Shared
import ClientListScreen from '../screens/shared/ClientListScreen';
import ClientFormScreen from '../screens/shared/ClientFormScreen';
import ClientDetailScreen from '../screens/shared/ClientDetailScreen';
import UniteFormScreen from '../screens/shared/UniteFormScreen';
import SousTitreFormScreen from '../screens/shared/SousTitreFormScreen';
import BonListScreen from '../screens/shared/BonListScreen';
import BonDetailScreen from '../screens/shared/BonDetailScreen';
import FacturationScreen from '../screens/shared/FacturationScreen';
import FacturationFormScreen from '../screens/shared/FacturationFormScreen';

// Employer
import PlanningListScreen from '../screens/employer/PlanningListScreen';
import PlanningFormScreen from '../screens/employer/PlanningFormScreen';
import PlanningDetailScreen from '../screens/employer/PlanningDetailScreen';
import ExpenseListScreen from '../screens/employer/ExpenseListScreen';
import ExpenseFormScreen from '../screens/employer/ExpenseFormScreen';
import MyAccessRequestScreen from '../screens/employer/MyAccessRequestScreen';
import MyCongeScreen from '../screens/employer/MyCongeScreen';

// RH
import EmployeeListScreen from '../screens/rh/EmployeeListScreen';
import EmployeeDetailScreen from '../screens/rh/EmployeeDetailScreen';
import EmployeeFormScreen from '../screens/rh/EmployeeFormScreen';
import AccessRequestListScreen from '../screens/rh/AccessRequestListScreen';
import AccessRequestFormScreen from '../screens/rh/AccessRequestFormScreen';
import AccessRequestDetailScreen from '../screens/rh/AccessRequestDetailScreen';
import CongeManagementScreen from '../screens/rh/CongeManagementScreen';
import PlanningCalendarScreen from '../screens/employer/PlanningCalendarScreen';
import PointageFormScreen from '../screens/shared/PointageFormScreen';
import PointageListScreen from '../screens/shared/PointageListScreen';
import MonthlySummaryScreen from '../screens/admin/MonthlySummaryScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Scroll-hide context ────────────────────────────────────────────────────
// Child screens call `onScroll` from this context to hide/show the tab bar
export const TabBarScrollContext = createContext({
  scrollY: new Animated.Value(0),
  onScroll: () => {},
});

export const useTabBarScroll = () => useContext(TabBarScrollContext);

// ── Tab icon ───────────────────────────────────────────────────────────────
const TabIcon = ({ icon, label, focused }) => (
  <View style={[styles.tabItem, focused && styles.tabItemFocused]}>
    <MaterialIcons
      name={icon}
      size={22}
      color={focused ? '#FFFFFF' : '#003664'}
    />
    <Text style={[styles.tabLabel, focused ? styles.tabLabelFocused : styles.tabLabelInactive]}>
      {label}
    </Text>
  </View>
);

// Home Stack ─────────────────────────────────────────────────────────────
const HomeStack = () => (
  <Stack.Navigator screenOptions={{ ...stackOpts, headerShown: false }}>
    <Stack.Screen name="Dashboard" component={DashboardScreen} />
  </Stack.Navigator>
);

// ── Profile Stack ──────────────────────────────────────────────────────────
const ProfileStack = () => (
  <Stack.Navigator screenOptions={stackOpts}>
    <Stack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'Mon Profil' }} />
  </Stack.Navigator>
);

// ── Menu Stack (all feature screens live here) ─────────────────────────────
const MenuStack = () => (
  <Stack.Navigator screenOptions={stackOpts}>
    {/* Hub */}
    <Stack.Screen name="MenuMain" component={MenuScreen} options={{ headerShown: false }} />

    {/* Clients */}
    <Stack.Screen name="ClientList" component={ClientListScreen} options={{ title: 'Clients' }} />
    <Stack.Screen name="ClientForm" component={ClientFormScreen} options={({ route }) => ({ title: route.params?.clientId ? 'Modifier Client' : 'Nouveau Client' })} />
    <Stack.Screen name="ClientDetail" component={ClientDetailScreen} options={{ title: 'Détails Client' }} />
    <Stack.Screen name="UniteForm" component={UniteFormScreen} options={{ title: 'Nouvelle Unité' }} />
    <Stack.Screen name="SousTitreForm" component={SousTitreFormScreen} options={{ title: 'Nouveau Sous-titre' }} />

    {/* Planning */}
    <Stack.Screen name="PlanningCalendar" component={PlanningCalendarScreen} options={{ title: 'Planning' }} />
    <Stack.Screen name="PlanningList" component={PlanningListScreen} options={{ title: 'Tâches' }} />
    <Stack.Screen name="PlanningForm" component={PlanningFormScreen} options={({ route }) => ({ title: route.params?.planningId ? 'Modifier Tâche' : 'Nouvelle Tâche' })} />
    <Stack.Screen name="PlanningDetail" component={PlanningDetailScreen} options={{ title: 'Détails Tâche' }} />

    {/* Bons de Réception */}
    <Stack.Screen name="BonList" component={BonListScreen} options={{ title: 'Bons de Réception' }} />
    <Stack.Screen name="BonDetail" component={BonDetailScreen} options={{ title: 'Détails Bon' }} />

    {/* Dépenses */}
    <Stack.Screen name="ExpenseList" component={ExpenseListScreen} options={{ title: 'Dépenses' }} />
    {/* This screen renders its own header with a back arrow, so the stack
        header would appear above it as a duplicate bar. */}
    <Stack.Screen name="ExpenseForm" component={ExpenseFormScreen} options={{ headerShown: false }} />

    {/* Facturation */}
    <Stack.Screen name="FacturationMain" component={FacturationScreen} options={{ title: 'Historique Factures' }} />
    <Stack.Screen name="FacturationForm" component={FacturationFormScreen} options={{ title: 'Nouvelle Facture' }} />

    {/* Employés */}
    <Stack.Screen name="EmployeeList" component={EmployeeListScreen} options={{ title: 'Employés' }} />
    <Stack.Screen name="EmployeeDetail" component={EmployeeDetailScreen} options={{ title: 'Détails Employé' }} />
    <Stack.Screen name="EmployeeForm" component={EmployeeFormScreen} options={({ route }) => ({ title: route.params?.employeeId ? 'Modifier Employé' : 'Nouvel Employé' })} />

    {/* Demandes d'Accès (RH/Admin/Responsable) */}
    <Stack.Screen name="AccessRequestList" component={AccessRequestListScreen} options={{ title: 'Demandes d\'Accès' }} />
    <Stack.Screen name="AccessRequestForm" component={AccessRequestFormScreen} options={({ route }) => ({ title: route.params?.requestId ? 'Modifier Demande' : 'Nouvelle Demande' })} />
    <Stack.Screen name="AccessRequestDetail" component={AccessRequestDetailScreen} options={{ title: 'Détails Demande' }} />

    {/* Mes Accès (Employer) */}
    <Stack.Screen name="MyAccessList" component={MyAccessRequestScreen} options={{ title: 'Mes Demandes d\'Accès' }} />

    {/* Congés */}
    <Stack.Screen name="MyCongeMain" component={MyCongeScreen} options={{ title: 'Mes Congés' }} />
    <Stack.Screen name="CongeManagementMain" component={CongeManagementScreen} options={{ title: 'Demandes de Congé' }} />

    {/* Pointage */}
    <Stack.Screen name="PointageForm" component={PointageFormScreen} options={{ title: 'Pointage Journalier' }} />
    <Stack.Screen name="PointageList" component={PointageListScreen} options={{ title: 'Pointages' }} />

    {/* Rapport Mensuel */}
    <Stack.Screen name="MonthlySummary" component={MonthlySummaryScreen} options={{ title: 'Rapport Mensuel' }} />
  </Stack.Navigator>
);

// ── Animated Tab Bar ───────────────────────────────────────────────────────
const AnimatedTabBar = ({ state, descriptors, navigation, translateY, insets }) => {
  const TAB_BAR_HEIGHT = 64 + insets.bottom;

  return (
    <Animated.View
      style={[
        styles.tabBar,
        {
          height: TAB_BAR_HEIGHT,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const iconMap = { Home: 'dashboard', Menu: 'menu', Profile: 'person' };
        const labelMap = { Home: 'ACCUEIL', Menu: 'MENU', Profile: 'PROFIL' };

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (event.defaultPrevented) return;

          if (isFocused) {
            // Tapping the active tab returns to its first screen. Without this
            // there was no way back to the menu list once you opened something
            // from it, since the only other route out was the header arrow.
            navigation.navigate(route.name, { screen: undefined });
            navigation.emit({ type: 'tabLongPress', target: route.key });
            const nested = state.routes[index].state;
            if (nested && nested.index > 0) {
              navigation.dispatch({
                ...CommonActions.reset({
                  index: 0,
                  routes: [{ name: nested.routeNames[0] }],
                }),
                target: nested.key,
              });
            }
            return;
          }

          navigation.navigate(route.name);
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabTouchable}
            onPress={onPress}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={labelMap[route.name]}
          >
            <View style={styles.tabTouchableInner}>
              <TabIcon
                icon={iconMap[route.name]}
                label={labelMap[route.name]}
                focused={isFocused}
              />
            </View>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
};

// ── Main Tab Navigator ─────────────────────────────────────────────────────
const TabNavigator = () => {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;
  const isHidden = useRef(false);

  const TAB_BAR_HEIGHT = 64 + insets.bottom;

  // The bar is part of the layout now and never hides, so this only has to keep
  // scrollY current for any screen that still reads it. The old spring that
  // translated the bar off-screen was left running against a value nothing used.
  const handleScroll = useCallback((event) => {
    lastScrollY.current = event.nativeEvent.contentOffset.y;
  }, []);

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: handleScroll,
    }
  );

  return (
    <TabBarScrollContext.Provider value={{ scrollY, onScroll, handleScroll }}>
      <Tab.Navigator
        tabBar={(props) => (
          <AnimatedTabBar
            {...props}
            translateY={tabBarTranslateY}
            insets={insets}
          />
        )}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen name="Home" component={HomeStack} />
        <Tab.Screen name="Menu" component={MenuStack} />
        <Tab.Screen name="Profile" component={ProfileStack} />
      </Tab.Navigator>
    </TabBarScrollContext.Provider>
  );
};

// ── Shared stack options ───────────────────────────────────────────────────
const stackOpts = {
  headerStyle: { backgroundColor: '#003664' },
  headerTintColor: '#FFFFFF',
  headerTitleStyle: { fontWeight: '600', fontSize: 16 },
  headerBackTitle: '',
  // One consistent push/pop transition everywhere. Screens previously inherited
  // whatever the platform default was, so movement felt different per screen.
  animation: 'slide_from_right',
  // Lets the swipe-back gesture work on both platforms, giving a second way out
  // of a screen besides the header arrow.
  gestureEnabled: true,
};

const styles = StyleSheet.create({
  tabBar: {
    // Deliberately NOT absolutely positioned. As an absolute overlay it covered
    // the bottom of every screen that did not guess the right padding, which hid
    // buttons and the last list rows.
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    // Tinted ambient shadow (from DESIGN.md)
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 54, 100, 0.12)',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 1,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  tabTouchable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabTouchableInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 2,
  },
  tabItemFocused: {
    backgroundColor: '#785A00', // Brass gold from Nautical palette
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  tabLabelFocused: {
    color: '#FFFFFF',
  },
  tabLabelInactive: {
    color: '#003664',
    opacity: 0.85,
  },
});

export default TabNavigator;
