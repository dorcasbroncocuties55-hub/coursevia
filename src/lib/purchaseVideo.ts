import { supabase } from "@/integrations/supabase/client";

type PurchaseVideoArgs = {
  userId: string;
  videoId: string;
  ownerId: string;
  amount: number;
};

export const purchaseVideo = async ({
  userId,
  videoId,
  ownerId,
  amount,
}: PurchaseVideoArgs) => {
  const platformFee = Number((amount * 0.05).toFixed(2));
  const ownerAmount = Number((amount - platformFee).toFixed(2));

  const { data: ownerWallet } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", ownerId)
    .maybeSingle();

  const { data: buyerWallet } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const { error: purchaseError } = await supabase.from("purchases" as any).insert({
    user_id: userId,
    video_id: videoId,
    amount,
    platform_fee: platformFee,
    owner_amount: ownerAmount,
  });

  if (purchaseError) throw purchaseError;

  if (ownerWallet) {
    await supabase
      .from("wallets")
      .update({
        pending_balance: Number((ownerWallet as any).pending_balance || 0) + ownerAmount,
      } as any)
      .eq("id", ownerWallet.id);
  }

  await supabase.from("transactions").insert({
    amount,
    type: "video_purchase",
    status: "completed",
    from_wallet_id: buyerWallet?.id ?? null,
    to_wallet_id: ownerWallet?.id ?? null,
    commission_amount: platformFee,
    commission_rate: 0.05,
  });

  return {
    platformFee,
    ownerAmount,
  };
};
