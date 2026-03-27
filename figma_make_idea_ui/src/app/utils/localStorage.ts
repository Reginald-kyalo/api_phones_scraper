// Local storage utilities for managing user data

export interface User {
  id: string;
  name: string;
  email: string;
  region: string;
  subscription: 'free' | 'premium';
  avatar?: string;
}

export interface PriceAlert {
  id: string;
  productId: string;
  productName: string;
  targetPrice: number;
  currentPrice: number;
  status: 'active' | 'triggered' | 'paused';
  createdAt: string;
  triggeredAt?: string;
}

export interface NotificationPreferences {
  priceDropAlerts: boolean;
  dailyDealsEmail: boolean;
  weeklyNewsletter: boolean;
  newReviewNotifications: boolean;
}

// Authentication
export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('currentUser');
  return userStr ? JSON.parse(userStr) : null;
};

export const setCurrentUser = (user: User | null): void => {
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
  } else {
    localStorage.removeItem('currentUser');
  }
};

export const isAuthenticated = (): boolean => {
  return getCurrentUser() !== null;
};

export const login = (email: string, password: string): User | null => {
  // Mock login - in real app this would call an API
  const users = getUsers();
  const user = users.find(u => u.email === email);
  
  if (user) {
    setCurrentUser(user);
    return user;
  }
  return null;
};

export const register = (name: string, email: string, password: string): User => {
  const users = getUsers();
  const newUser: User = {
    id: Date.now().toString(),
    name,
    email,
    region: 'NZ',
    subscription: 'free',
  };
  
  users.push(newUser);
  localStorage.setItem('users', JSON.stringify(users));
  setCurrentUser(newUser);
  return newUser;
};

export const logout = (): void => {
  setCurrentUser(null);
};

const getUsers = (): User[] => {
  const usersStr = localStorage.getItem('users');
  return usersStr ? JSON.parse(usersStr) : [];
};

// Favorites
export const getFavorites = (): string[] => {
  const favStr = localStorage.getItem('favorites');
  return favStr ? JSON.parse(favStr) : [];
};

export const addToFavorites = (productId: string): void => {
  const favorites = getFavorites();
  if (!favorites.includes(productId)) {
    favorites.push(productId);
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }
};

export const removeFromFavorites = (productId: string): void => {
  const favorites = getFavorites();
  const updated = favorites.filter(id => id !== productId);
  localStorage.setItem('favorites', JSON.stringify(updated));
};

export const isFavorite = (productId: string): boolean => {
  return getFavorites().includes(productId);
};

export const toggleFavorite = (productId: string): boolean => {
  if (isFavorite(productId)) {
    removeFromFavorites(productId);
    return false;
  } else {
    addToFavorites(productId);
    return true;
  }
};

// Price Alerts
export const getPriceAlerts = (): PriceAlert[] => {
  const alertsStr = localStorage.getItem('priceAlerts');
  return alertsStr ? JSON.parse(alertsStr) : [];
};

export const addPriceAlert = (
  productId: string,
  productName: string,
  targetPrice: number,
  currentPrice: number
): PriceAlert => {
  const alerts = getPriceAlerts();
  const newAlert: PriceAlert = {
    id: Date.now().toString(),
    productId,
    productName,
    targetPrice,
    currentPrice,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  
  alerts.push(newAlert);
  localStorage.setItem('priceAlerts', JSON.stringify(alerts));
  return newAlert;
};

export const updatePriceAlert = (id: string, updates: Partial<PriceAlert>): void => {
  const alerts = getPriceAlerts();
  const index = alerts.findIndex(a => a.id === id);
  
  if (index !== -1) {
    alerts[index] = { ...alerts[index], ...updates };
    localStorage.setItem('priceAlerts', JSON.stringify(alerts));
  }
};

export const deletePriceAlert = (id: string): void => {
  const alerts = getPriceAlerts();
  const updated = alerts.filter(a => a.id !== id);
  localStorage.setItem('priceAlerts', JSON.stringify(updated));
};

export const getActivePriceAlerts = (): PriceAlert[] => {
  return getPriceAlerts().filter(a => a.status === 'active');
};

export const getTriggeredPriceAlerts = (): PriceAlert[] => {
  return getPriceAlerts().filter(a => a.status === 'triggered');
};

// Notification Preferences
export const getNotificationPreferences = (): NotificationPreferences => {
  const prefStr = localStorage.getItem('notificationPreferences');
  return prefStr ? JSON.parse(prefStr) : {
    priceDropAlerts: true,
    dailyDealsEmail: true,
    weeklyNewsletter: false,
    newReviewNotifications: true,
  };
};

export const updateNotificationPreferences = (prefs: NotificationPreferences): void => {
  localStorage.setItem('notificationPreferences', JSON.stringify(prefs));
};

// Search History
export const getSearchHistory = (): string[] => {
  const historyStr = localStorage.getItem('searchHistory');
  return historyStr ? JSON.parse(historyStr) : [];
};

export const addToSearchHistory = (query: string): void => {
  const history = getSearchHistory();
  const updated = [query, ...history.filter(q => q !== query)].slice(0, 10);
  localStorage.setItem('searchHistory', JSON.stringify(updated));
};

export const clearSearchHistory = (): void => {
  localStorage.removeItem('searchHistory');
};
