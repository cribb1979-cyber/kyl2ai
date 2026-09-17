import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { colors, fonts } from "../../constants/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.graphiteMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.hairline,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.body,
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="fridge"
        options={{
          title: "Kylskåp",
          tabBarIcon: ({ color, size }) => <Ionicons name="snow" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="shopping-list"
        options={{
          title: "Inköpslista",
          tabBarIcon: ({ color, size }) => <Ionicons name="cart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: "Recept",
          tabBarIcon: ({ color, size }) => <Ionicons name="restaurant" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Inställningar",
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
