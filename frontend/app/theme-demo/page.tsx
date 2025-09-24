"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const themes = {
  current: {
    name: "Current (Pure White)",
    background: "rgb(255, 255, 255)",
    card: "rgb(255, 255, 255)",
    secondary: "rgb(245, 245, 245)",
    border: "rgb(229, 231, 235)",
    text: "rgb(31, 41, 55)", // Dark gray text
    mutedText: "rgb(107, 114, 128)", // Medium gray
  },
  cream: {
    name: "Warm Cream/Ivory",
    background: "rgb(253, 251, 247)",
    card: "rgb(254, 252, 249)",
    secondary: "rgb(250, 247, 242)",
    border: "rgb(235, 230, 220)",
    text: "rgb(46, 42, 37)", // Warm dark brown
    mutedText: "rgb(92, 84, 74)", // Warm medium brown
  },
  blueWhite: {
    name: "Soft Blue-White",
    background: "rgb(249, 251, 254)",
    card: "rgb(251, 252, 254)",
    secondary: "rgb(243, 247, 252)",
    border: "rgb(219, 228, 239)",
    text: "rgb(30, 41, 59)", // Cool dark blue-gray
    mutedText: "rgb(71, 85, 105)", // Cool medium blue-gray
  },
  beige: {
    name: "Warm Beige/Sand",
    background: "rgb(251, 248, 244)",
    card: "rgb(252, 250, 247)",
    secondary: "rgb(247, 243, 237)",
    border: "rgb(230, 223, 211)",
    text: "rgb(44, 38, 30)", // Rich brown
    mutedText: "rgb(92, 80, 63)", // Medium brown
  },
  greenWhite: {
    name: "Soft Green-White",
    background: "rgb(248, 252, 250)",
    card: "rgb(250, 253, 251)",
    secondary: "rgb(243, 249, 246)",
    border: "rgb(220, 235, 227)",
    text: "rgb(30, 41, 37)", // Deep green-gray
    mutedText: "rgb(74, 94, 87)", // Medium green-gray
  },
  champagne: {
    name: "Light Champagne",
    background: "rgb(252, 250, 247)",
    card: "rgb(253, 251, 249)",
    secondary: "rgb(249, 246, 241)",
    border: "rgb(235, 228, 218)",
    text: "rgb(41, 37, 31)", // Warm dark gray
    mutedText: "rgb(87, 79, 66)", // Warm medium gray
  },
};

export default function ThemeDemo() {
  const [selectedTheme, setSelectedTheme] = useState<keyof typeof themes>("current");

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: "rgb(245, 245, 245)" }}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8" style={{ color: "rgb(31, 41, 55)" }}>
          Light Theme Color Options
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(themes).map(([key, theme]) => (
            <div
              key={key}
              className="p-6 rounded-lg border-2 transition-all"
              style={{
                backgroundColor: theme.background,
                borderColor: selectedTheme === key ? "rgb(32, 178, 170)" : theme.border,
              }}
            >
              <h2 className="text-xl font-semibold mb-4" style={{ color: theme.text }}>
                {theme.name}
              </h2>
              
              <Card style={{ backgroundColor: theme.card, borderColor: theme.border, color: theme.text }}>
                <CardHeader>
                  <CardTitle>Sample Card</CardTitle>
                  <CardDescription>This is how cards would look</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button variant="default" size="sm">Primary</Button>
                    <Button variant="secondary" size="sm" style={{ backgroundColor: theme.secondary }}>
                      Secondary
                    </Button>
                    <Button variant="outline" size="sm" style={{ borderColor: theme.border }}>
                      Outline
                    </Button>
                  </div>
                  
                  <Input 
                    placeholder="Sample input field" 
                    style={{ 
                      backgroundColor: theme.card,
                      borderColor: theme.border 
                    }}
                  />
                  
                  <div className="flex gap-2">
                    <Badge>Badge 1</Badge>
                    <Badge variant="secondary" style={{ backgroundColor: theme.secondary }}>
                      Badge 2
                    </Badge>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <p style={{ color: theme.text }}>Regular text would appear like this.</p>
                    <p style={{ color: theme.mutedText }}>Muted text for descriptions.</p>
                  </div>
                </CardContent>
              </Card>
              
              <div className="mt-4 p-3 rounded" style={{ backgroundColor: theme.secondary }}>
                <p className="text-sm" style={{ color: theme.text }}>Secondary background area</p>
              </div>
              
              <button
                onClick={() => setSelectedTheme(key as keyof typeof themes)}
                className="mt-4 w-full py-2 px-4 rounded text-sm font-medium transition-colors"
                style={{
                  backgroundColor: selectedTheme === key ? "rgb(32, 178, 170)" : theme.secondary,
                  color: selectedTheme === key ? "white" : theme.text,
                }}
              >
                {selectedTheme === key ? "Selected" : "Select This Theme"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}