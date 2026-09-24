// Expense vocabulary shared by the form and the list.
//
// The web app stored English keys ('Materials', 'Tools', ...) while this app
// stored French words ('Matériaux', 'Alimentation', ...). Both went into the
// same free-text `category` field, so the admin monthly report split one real
// category into two buckets depending on which client created the expense.
//
// `value` is what gets stored and must stay identical to the web options in
// rmc-web/frontend/src/components/employer/ExpenseForm.js. `label` is display only.
export const EXPENSE_CATEGORIES = [
  { value: 'Materials', label: 'Matériaux', icon: 'handyman' },
  { value: 'Tools', label: 'Outils', icon: 'build' },
  { value: 'Parts', label: 'Pièces Bateaux', icon: 'settings' },
  { value: 'Fuel', label: 'Carburant', icon: 'local-gas-station' },
  { value: 'Transport', label: 'Transport', icon: 'directions-car' },
  { value: 'Meals', label: 'Repas', icon: 'restaurant' },
  { value: 'Other', label: 'Autre', icon: 'more-horiz' },
];

// Values written before the two apps agreed. Kept so historical rows still show
// a readable label instead of a raw French string.
const LEGACY_CATEGORY_LABELS = {
  'Alimentation': 'Repas',
  'Matériaux': 'Matériaux',
  'Outils': 'Outils',
  'Autre': 'Autre',
};

export const getCategoryLabel = (value) => {
  if (!value) return '';
  const match = EXPENSE_CATEGORIES.find((c) => c.value === value);
  if (match) return match.label;
  return LEGACY_CATEGORY_LABELS[value] || value;
};

// Matches the paymentMethod enum in backend/models/Expense.js.
export const PAYMENT_METHODS = [
  { value: 'espece', label: 'Espèce', icon: 'payments' },
  { value: 'virement_bancaire', label: 'Virement Bancaire', icon: 'account-balance' },
];

export const getPaymentMethodLabel = (value) =>
  (PAYMENT_METHODS.find((m) => m.value === value) || {}).label || value || '';
