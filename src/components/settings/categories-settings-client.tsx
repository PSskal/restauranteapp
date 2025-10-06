"use client";

import { useOrganization } from "@/contexts/organization-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, ArrowUp, ArrowDown, Edit, Trash2 } from "lucide-react";
import { useState } from "react";

export function CategoriesSettingsClient() {
  const { currentOrg } = useOrganization();
  const [categories, setCategories] = useState([
    { id: 1, name: "Appetizers", position: 1, itemCount: 5 },
    { id: 2, name: "Main Courses", position: 2, itemCount: 12 },
    { id: 3, name: "Beverages", position: 3, itemCount: 8 },
    { id: 4, name: "Desserts", position: 4, itemCount: 6 },
  ]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const newCategory = {
        id: categories.length + 1,
        name: newCategoryName,
        position: categories.length + 1,
        itemCount: 0,
      };
      setCategories([...categories, newCategory]);
      setNewCategoryName("");
      setShowAddForm(false);
    }
  };

  const moveCategory = (categoryId: number, direction: "up" | "down") => {
    const categoryIndex = categories.findIndex((c) => c.id === categoryId);
    if (categoryIndex === -1) return;

    const newCategories = [...categories];
    const targetIndex =
      direction === "up" ? categoryIndex - 1 : categoryIndex + 1;

    if (targetIndex >= 0 && targetIndex < categories.length) {
      [newCategories[categoryIndex], newCategories[targetIndex]] = [
        newCategories[targetIndex],
        newCategories[categoryIndex],
      ];

      newCategories[categoryIndex].position = categoryIndex + 1;
      newCategories[targetIndex].position = targetIndex + 1;

      setCategories(newCategories);
    }
  };

  if (!currentOrg) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">
              Loading organization data...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Categorías del Menú</h3>
          <p className="text-gray-600">
            Organiza los elementos de tu menú en categorías
          </p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {showAddForm ? "Cancel" : "Add Category"}
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-end gap-4">
              <div className="space-y-2">
                <Label>Category Name</Label>
                <Input
                  placeholder="Soups"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
              </div>
              <Button onClick={handleAddCategory}>Create Category</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {categories
          .sort((a, b) => a.position - b.position)
          .map((category, index) => (
            <Card key={category.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => moveCategory(category.id, "up")}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => moveCategory(category.id, "down")}
                        disabled={index === categories.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <div>
                      <h4 className="font-semibold">{category.name}</h4>
                      <p className="text-sm text-gray-500">
                        {category.itemCount} items • Position{" "}
                        {category.position}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      View Items
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
