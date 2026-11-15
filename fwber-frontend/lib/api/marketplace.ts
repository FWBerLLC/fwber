import { api } from './client';

export interface InventoryItem {
    id: number;
    merchant_profile_id: number;
    name: string;
    description: string;
    price_tokens: string | number;
    stock_count: number;
    image_url?: string;
    is_available: boolean;
}

export interface PurchaseResponse {
    message: string;
    redemption_code: string;
    remaining_balance: string | number;
}

export const marketplaceApi = {
    getInventory: (merchantId: string | number) => 
        api.get<{ items: InventoryItem[] }>(`/marketplace/${merchantId}`),
    
    purchaseItem: (itemId: number) => 
        api.post<PurchaseResponse>(`/marketplace/purchase/${itemId}`),
    
    getNearbyItems: (params: { lat: number; lng: number; radius_m?: number }) =>
        api.get<{ items: InventoryItem[] }>('/marketplace/nearby', { params }),

    // Merchant Actions
    getOwnedInventory: () => 
        api.get<{ items: InventoryItem[] }>(`/merchant-portal/inventory`),
    
    createItem: (data: Partial<InventoryItem>) => 
        api.post<{ item: InventoryItem }>(`/merchant-portal/inventory`, data),

    deleteItem: (itemId: number) =>
        api.delete<{ success: boolean; id: number }>(`/merchant-portal/inventory/${itemId}`),
    
    redeemCode: (code: string) => 
        api.post<{ success: boolean; item_name: string; user_name: string }>(`/merchant-portal/inventory/redeem`, { code }),
};
