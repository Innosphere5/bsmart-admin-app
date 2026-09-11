// B'Smart Admin Mock Data matching design screens

export const overviewMetrics = {
  ordersToday: {
    title: 'Orders Today',
    count: 24,
    badgeText: '+ 12%',
    badgeType: 'success',
    icon: 'bag-handle-outline',
  },
  pendingOrders: {
    title: 'Pending Orders',
    count: 8,
    badgeText: 'Needs action',
    badgeType: 'warning',
    icon: 'time-outline',
  },
  totalProducts: {
    title: 'Total Products',
    count: 342,
    badgeText: '',
    badgeType: '',
    icon: 'clipboard-outline',
  },
  lowStockItems: {
    title: 'Low Stock Items',
    count: 12,
    badgeText: 'Manage',
    badgeType: 'danger',
    icon: 'alert-circle-outline',
    isWarningCard: true,
  },
};

export const recentOrders = [
  {
    id: 'ord-092',
    orderId: '#ORD-092',
    customer: 'Sarah Jenkins',
    amount: '$124.50',
    status: 'Pending',
  },
  {
    id: 'ord-091',
    orderId: '#ORD-091',
    customer: 'Michael Chang',
    amount: '$89.00',
    status: 'Confirmed',
  },
  {
    id: 'ord-090',
    orderId: '#ORD-090',
    customer: 'Emily Davis',
    amount: '$210.75',
    status: 'Delivered',
  },
];

export const allOrders = [
  {
    id: 'bs-1024',
    orderNo: '#BS1024',
    status: 'Pending',
    price: '₹2,450',
    date: 'Today, 10:30 AM',
    customer: 'Rahul Sharma',
    school: 'Delhi Public School',
    itemsCount: 3,
  },
  {
    id: 'bs-1023',
    orderNo: '#BS1023',
    status: 'Ready',
    price: '₹1,800',
    date: 'Yesterday',
    customer: 'Anita Desai',
    school: "St. Xavier's High",
    itemsCount: 2,
  },
  {
    id: 'bs-1022',
    orderNo: '#BS1022',
    status: 'Delivered',
    price: '₹4,200',
    date: 'Oct 24, 2023',
    customer: 'Vikram Singh',
    school: 'Modern School',
    itemsCount: 5,
  },
  {
    id: 'bs-1019',
    orderNo: '#BS1019',
    status: 'Cancelled',
    price: '₹950',
    date: 'Oct 22, 2023',
    customer: 'Priya Patel',
    school: 'Kendriya Vidyalaya',
    itemsCount: 1,
  },
];

export const inventoryItems = [
  {
    id: 'inv-1',
    name: 'Navy Polo Shirt',
    school: 'Oakridge High',
    size: 'Size M',
    status: 'Low Stock',
    stockLeft: 15,
  },
  {
    id: 'inv-2',
    name: 'Khaki Trousers',
    school: 'Lincoln Elementary',
    size: 'Size 10',
    status: 'In Stock',
    stockLeft: 45,
  },
  {
    id: 'inv-3',
    name: 'Fleece Jacket',
    school: 'Oakridge High',
    size: 'Size L',
    status: 'Out of Stock',
    stockLeft: 0,
  },
];

export const categories = [
  'Boys Uniform',
  'Girls Uniform',
  'Sports Wear',
  'Winter Jacket / Fleece',
  'Accessories (Ties, Belts)',
];

export const schoolsList = [
  'Delhi Public School',
  "St. Xavier's High",
  'Modern School',
  'Kendriya Vidyalaya',
  'Oakridge High',
  'Lincoln Elementary',
];

export const classGroups = [
  { id: '1', label: 'I - V' },
  { id: '2', label: 'VI - VIII' },
  { id: '3', label: 'IX - X' },
  { id: '4', label: 'XI - XII' },
];
