import type { MenuItem } from "./types"

export const menu: MenuItem[] = [
  { id: "m_chocolate_croissant", name: "Chocolate Croissant", price: 4.5, category: "pastries", popular: true, allergens: ["dairy", "gluten"] },
  { id: "m_almond_croissant", name: "Almond Croissant", price: 4.75, category: "pastries", allergens: ["dairy", "gluten", "tree-nut"] },
  { id: "m_red_velvet_cake", name: "Red Velvet Cake (slice)", price: 6.5, category: "cakes", popular: true, allergens: ["dairy", "gluten", "egg"] },
  { id: "m_vanilla_cake", name: "Vanilla Birthday Cake (slice)", price: 6.0, category: "cakes", allergens: ["dairy", "gluten", "egg"] },
  { id: "m_iced_chai", name: "Iced Chai Latte", price: 5.75, category: "drinks", popular: true, allergens: ["dairy"] },
  { id: "m_hot_chai", name: "Hot Chai Latte", price: 5.25, category: "drinks", allergens: ["dairy"] },
  { id: "m_lavender_latte", name: "Lavender Latte", price: 6.0, category: "drinks", newItem: true, allergens: ["dairy"] },
  { id: "m_coconut_cold_brew", name: "Coconut Cold Brew", price: 6.0, category: "drinks", newItem: true, allergens: [] },
  { id: "m_mango_refresher", name: "Mango Refresher", price: 5.5, category: "drinks", allergens: [] },
  { id: "m_oat_milk_latte", name: "Oat Milk Latte", price: 5.5, category: "drinks", allergens: ["gluten"] },
  { id: "m_sourdough", name: "Sourdough Loaf", price: 8.0, category: "breads", allergens: ["gluten"] },
  { id: "m_gluten_free_bread", name: "Gluten-Free Seed Bread", price: 9.5, category: "breads", allergens: [] },
]

export const getMenuItem = (id: string) => menu.find((m) => m.id === id)
