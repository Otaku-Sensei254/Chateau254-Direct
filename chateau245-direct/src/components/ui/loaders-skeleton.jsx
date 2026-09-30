import React from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import "./loaders-skeleton.css";

export function LoaderSkeleton({
  className = "",
  width = "100%",
  height = 20,
  borderRadius = 4,
  baseColor,
  highlightColor,
  duration = 1.5,
  style = {},
  ...props
}) {
  return (
    <div
      className={cn("loader-skeleton-container", className)}
      style={{
        width: width,
        height: height,
        borderRadius: borderRadius,
        ...(baseColor && { backgroundColor: baseColor }),
        ...style,
      }}
      {...props}
    >
      <motion.div
        className="loader-skeleton-shimmer"
        style={{
          background: `linear-gradient(90deg, transparent, ${
            highlightColor || "rgba(255, 255, 255, 0.4)"
          }, transparent)`,
        }}
        animate={{
          x: ["-100%", "100%"],
        }}
        transition={{
          duration,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />
    </div>
  );
}

export const MenuCardSkeleton = () => (
  <div className="skeleton-menu-card">
    <LoaderSkeleton height={165} borderRadius={0} />
    <div className="skeleton-menu-body">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <LoaderSkeleton width="60%" height={18} borderRadius={4} />
        <LoaderSkeleton width="25%" height={14} borderRadius={10} />
      </div>
      <LoaderSkeleton width="90%" height={12} borderRadius={4} />
      <LoaderSkeleton width="75%" height={12} borderRadius={4} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
        <LoaderSkeleton width="40%" height={16} borderRadius={4} />
        <LoaderSkeleton width={32} height={32} borderRadius={16} />
      </div>
    </div>
  </div>
);

export const WineCardSkeleton = () => (
  <div className="skeleton-wine-card">
    <div className="skeleton-wine-thumb">
      <LoaderSkeleton width={50} height={150} borderRadius={6} />
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <LoaderSkeleton width="50%" height={12} borderRadius={4} />
      <LoaderSkeleton width="85%" height={16} borderRadius={4} />
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <LoaderSkeleton width={60} height={18} borderRadius={10} />
        <LoaderSkeleton width={50} height={18} borderRadius={10} />
      </div>
    </div>
  </div>
);

export const CartItemSkeleton = () => (
  <div className="skeleton-cart-item">
    <LoaderSkeleton width={64} height={64} borderRadius={8} />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
      <LoaderSkeleton width="70%" height={16} borderRadius={4} />
      <LoaderSkeleton width="40%" height={14} borderRadius={4} />
    </div>
    <LoaderSkeleton width={80} height={32} borderRadius={16} />
  </div>
);

export const ProfileOrderSkeleton = () => (
  <div className="skeleton-profile-order">
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <LoaderSkeleton width={110} height={16} borderRadius={4} />
      <LoaderSkeleton width={80} height={12} borderRadius={4} />
    </div>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
      <LoaderSkeleton width={70} height={16} borderRadius={10} />
      <LoaderSkeleton width={90} height={16} borderRadius={4} />
    </div>
  </div>
);

export const AdminKPISkeleton = () => (
  <div className="skeleton-admin-kpi">
    <LoaderSkeleton width={48} height={48} borderRadius={12} />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
      <LoaderSkeleton width="50%" height={12} borderRadius={4} />
      <LoaderSkeleton width="70%" height={22} borderRadius={4} />
    </div>
  </div>
);

export const AdminWorkspaceSkeleton = () => (
  <div className="admin-workspace-skeleton" style={{ width: "100%", padding: "20px 0" }}>
    <div className="skeleton-admin-grid">
      <AdminKPISkeleton />
      <AdminKPISkeleton />
      <AdminKPISkeleton />
      <AdminKPISkeleton />
    </div>
    <div className="skeleton-admin-table">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <LoaderSkeleton width={180} height={22} borderRadius={4} />
        <LoaderSkeleton width={100} height={32} borderRadius={8} />
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="skeleton-table-row">
          <LoaderSkeleton width={80} height={14} borderRadius={4} />
          <LoaderSkeleton width={140} height={14} borderRadius={4} />
          <LoaderSkeleton width={100} height={14} borderRadius={4} />
          <LoaderSkeleton width={90} height={14} borderRadius={4} />
          <LoaderSkeleton width={80} height={20} borderRadius={10} />
        </div>
      ))}
    </div>
  </div>
);

export const ViewItemSkeleton = () => (
  <div className="skeleton-view-item">
    <LoaderSkeleton width="100%" height={260} borderRadius={16} />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <LoaderSkeleton width="65%" height={28} borderRadius={6} />
      <LoaderSkeleton width="25%" height={24} borderRadius={6} />
    </div>
    <LoaderSkeleton width="90%" height={14} borderRadius={4} />
    <LoaderSkeleton width="80%" height={14} borderRadius={4} />
    <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
      <LoaderSkeleton width="30%" height={45} borderRadius={8} />
      <LoaderSkeleton width="30%" height={45} borderRadius={8} />
      <LoaderSkeleton width="30%" height={45} borderRadius={8} />
    </div>
    <LoaderSkeleton width="100%" height={48} borderRadius={10} style={{ marginTop: 20 }} />
  </div>
);

export default LoaderSkeleton;
