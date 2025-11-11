// utils/timeHelpers.js
export const getCurrentMeal = () => {
  const now = new Date();
  const hours = now.getHours();

  if (hours >= 7 && hours < 9) return "breakfast";
  if (hours >= 12 && hours < 14) return "lunch";
  if (hours >= 19 && hours < 21) return "dinner";

  return null; // no meal window currently open
};
