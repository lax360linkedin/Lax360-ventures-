import {
  Bot, Boxes, BrainCircuit, CalendarCheck, ClipboardList, Code2, CreditCard, FileText, Globe2, KeyRound, LayoutDashboard, Mail, MapPin, Megaphone,
  MessageCircle, MessagesSquare, Package, PenLine, Receipt, Search, Server, Share2, ShoppingCart, Smartphone, Sparkles, Users, Webhook, Workflow, Wrench,
  Layers, Cloud, Palette, Plug, TrendingUp, Network, Target,
} from 'lucide-react'

// One icon per individual service (keyed by service slug); anything missing falls back to its category icon.
export const serviceIcons = {
  'custom-software-development': Code2, 'website-development': Globe2, 'web-application-development': LayoutDashboard, 'mobile-application-development': Smartphone,
  'crm-and-erp-development': Users, 'business-management-systems': ClipboardList, 'e-commerce-development': ShoppingCart,
  'ai-application-development': Sparkles, 'ai-chatbots-and-virtual-assistants': MessagesSquare, 'ai-agent-development': Bot, 'rag-based-ai-solutions': Search,
  'business-process-automation': Workflow, 'workflow-automation': Webhook, 'ai-integration-and-consulting': BrainCircuit,
  'social-media-management': Share2, 'meta-ads-management': Megaphone, 'google-ads-management': Target, 'search-engine-optimization-seo': Search,
  'website-and-landing-page-optimization': TrendingUp, 'content-creation': PenLine, 'digital-marketing-strategy': Palette,
  'api-hub-development': Network, 'headless-backend-development': Server, 'multi-tenant-saas-development': Layers, 'white-label-saas-solutions': Boxes,
  'authentication-apis': KeyRound, 'billing-and-subscription-apis': Receipt, 'payment-gateway-integration': CreditCard, 'booking-and-appointment-apis': CalendarCheck,
  'crm-apis': Users, 'notification-apis': Mail, 'file-and-media-apis': FileText, 'ai-apis': Cloud,
  'n8n-workflow-automation': Workflow, 'whatsapp-automation': MessageCircle, 'email-automation': Mail, 'crm-automation': Users, 'ai-agent-workflows': Bot,
  'third-party-application-integration': Plug, 'webhook-integration': Webhook,
  'appointment-booking-applications': CalendarCheck, 'field-staff-and-task-tracking-applications': ClipboardList, 'employee-location-tracking-applications': MapPin,
  'business-billing-applications': Receipt, 'inventory-management-applications': Package, 'custom-business-mobile-applications': Wrench,
}
