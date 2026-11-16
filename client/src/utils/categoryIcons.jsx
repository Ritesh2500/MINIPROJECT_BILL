import React from 'react';
import {
  Zap,
  Droplets,
  Smartphone,
  Wifi,
  Home,
  GraduationCap,
  ShieldCheck,
  CreditCard,
  Landmark,
  Tv,
  Code2,
  Car,
  HeartPulse,
  ShoppingBag,
  Tag,
  Receipt,
  FileText
} from 'lucide-react';

const iconMap = {
  Zap,
  Droplets,
  Smartphone,
  Wifi,
  Home,
  GraduationCap,
  ShieldCheck,
  CreditCard,
  Landmark,
  Tv,
  Code2,
  Car,
  HeartPulse,
  ShoppingBag,
  Tag,
  Receipt,
  FileText
};

export function getCategoryIcon(iconName, className = 'w-4 h-4') {
  const IconComponent = iconMap[iconName] || Tag;
  return <IconComponent className={className} />;
}
