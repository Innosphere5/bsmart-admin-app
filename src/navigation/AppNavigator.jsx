import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import OverviewScreen from '../screens/OverviewScreen';
import InventoryScreen from '../screens/InventoryScreen';
import OrdersScreen from '../screens/OrdersScreen';
import AddProductScreen from '../screens/AddProductScreen';
import EditProductScreen from '../screens/EditProductScreen';
import CustomTabBar from '../components/CustomTabBar';
import { colors } from '../theme/colors';

export default function AppNavigator() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const navigationMock = {
    navigate: (routeName, params) => {
      if (params?.product) {
        setSelectedProduct(params.product);
      }
      setActiveTab(routeName);
    },
  };

  const stateMock = {
    index: ['Overview', 'Inventory', 'Orders', 'AddProduct'].indexOf(activeTab),
    routes: [
      { name: 'Overview' },
      { name: 'Inventory' },
      { name: 'Orders' },
      { name: 'AddProduct' },
    ],
  };

  const renderCurrentScreen = () => {
    switch (activeTab) {
      case 'Overview':
        return <OverviewScreen navigation={navigationMock} />;
      case 'Inventory':
        return <InventoryScreen navigation={navigationMock} />;
      case 'Orders':
        return <OrdersScreen navigation={navigationMock} />;
      case 'AddProduct':
        return <AddProductScreen navigation={navigationMock} />;
      case 'EditProduct':
        return <EditProductScreen navigation={navigationMock} product={selectedProduct} />;
      default:
        return <OverviewScreen navigation={navigationMock} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.screenContainer}>{renderCurrentScreen()}</View>
      <CustomTabBar state={stateMock} navigation={navigationMock} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContainer: {
    flex: 1,
  },
});

