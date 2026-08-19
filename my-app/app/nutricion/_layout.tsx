import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ModuleBack } from '@/components/module-back';
import { useTheme } from '@/hooks/use-theme';

export default function NutricionLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
        },
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.headerText,
        headerShown: true,
        headerLeft: () => <ModuleBack />,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Diario',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.bullet" color={color} />,
        }}
      />
      <Tabs.Screen
        name="catalogo"
        options={{
          title: 'Productos',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="fork.knife" color={color} />,
        }}
      />
      <Tabs.Screen
        name="recetas"
        options={{
          title: 'Recetas',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="book.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="objetivos"
        options={{
          title: 'Objetivos',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="target" color={color} />,
        }}
      />
      <Tabs.Screen
        name="peso"
        options={{
          title: 'Peso',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="scalemass" color={color} />,
        }}
      />
    </Tabs>
  );
}
