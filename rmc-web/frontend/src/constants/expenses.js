// Display labels for expense categories. Categories are stored as the English
// keys of ExpenseForm's options (shared with the mobile app), and the lists,
// the monthly report and its Excel export printed those keys as they were.
const CATEGORY_LABELS = {
  Materials: 'Matériaux',
  Tools: 'Outils',
  Parts: 'Pièces Bateaux',
  Fuel: 'Carburant',
  Transport: 'Transport',
  Meals: 'Repas',
  Other: 'Autre',
  Alimentation: 'Repas', // written by older versions of the mobile app
};

export const categoryLabel = (value) => CATEGORY_LABELS[value] || value;
