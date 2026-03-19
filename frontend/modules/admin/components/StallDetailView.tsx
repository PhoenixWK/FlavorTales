"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type AdminShopDetail,
  approveShop,
  rejectShop,
} from "@/modules/admin/services/adminShopApi";

import StallDetailBasicInfo from "./StallDetailBasicInfo";
import StallDetailDescriptionMedia from "./StallDetailDescriptionMedia";
import StallDetailAudioNarration from "./StallDetailAudioNarration";
import StallDetailLocationContact from "./StallDetailLocationContact";
import StallDetailActionBar from "./StallDetailActionBar";

//  Main Detail Component 

interface StallDetailViewProps {
  shop: AdminShopDetail;
}

export default function StallDetailView({ shop }: StallDetailViewProps) {
  const router = useRouter();
  const [actionTaken, setActionTaken] = useState<"accepted" | "declined" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleAccept = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await approveShop(shop.shopId);
      setActionTaken("accepted");
      setTimeout(() => router.push("/admin/pending-reviews"), 1500);
    } catch {
      setActionError("Failed to approve stall. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await rejectShop(shop.shopId);
      setActionTaken("declined");
      setTimeout(() => router.push("/admin/pending-reviews"), 1500);
    } catch {
      setActionError("Failed to reject stall. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-12">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 flex items-center gap-1.5 pt-2">
        <Link href="/admin/pending-reviews" className="hover:text-orange-500 transition">
          Food stall management
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{shop.name}</span>
      </nav>

      <StallDetailBasicInfo shop={shop} />

      <StallDetailDescriptionMedia shop={shop} />

      <StallDetailAudioNarration
        viAudioUrl={shop.viAudioUrl}
        enAudioUrl={shop.enAudioUrl}
      />

      <StallDetailLocationContact shop={shop} />

      <StallDetailActionBar
        onAccept={handleAccept}
        onDecline={handleDecline}
        busy={busy}
        actionTaken={actionTaken}
        actionError={actionError}
      />
    </div>
  );
}
