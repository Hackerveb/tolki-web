'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { useUser } from '@clerk/nextjs';
import { api } from '@/convex/_generated/api';
import { NeumorphicCard } from '@/components/NeumorphicCard';
import { colors } from '@/styles/colors';
import { shadows } from '@/styles/neumorphic';

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <polyline
      points="15 18 9 12 15 6"
      stroke={colors.foreground}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface CreditPurchase {
  id: string;
  date: number;
  amount: number;
  credits: number;
  status: 'completed' | 'pending' | 'failed';
  description: string;
}

const TransactionItem: React.FC<{ transaction: CreditPurchase }> = ({ transaction }) => {
  const getStatusColor = () => {
    switch (transaction.status) {
      case 'completed':
        return '#4caf50'; // colors.success
      case 'pending':
        return '#ff9800'; // colors.warning
      case 'failed':
        return '#e74c3c'; // colors.error
      default:
        return colors.foreground;
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <NeumorphicCard style={{ marginBottom: '16px', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Left Side */}
        <div style={{ flex: 1 }}>
          <p style={{
            fontSize: '12px',
            color: colors.silverAlpha(0.6),
            marginBottom: '4px',
            fontWeight: 400,
          }}>
            {formatDate(transaction.date)}
          </p>
          <p style={{
            fontSize: '14px',
            fontWeight: 400,
            color: colors.foreground,
            marginBottom: '2px',
            lineHeight: '1.4',
          }}>
            {transaction.description}
          </p>
          <p style={{
            fontSize: '13px',
            color: colors.primary,
            fontWeight: 400,
          }}>
            {transaction.credits} credits
          </p>
        </div>

        {/* Right Side */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          marginLeft: '16px',
        }}>
          <p style={{
            fontSize: '17px',
            fontWeight: 600,
            color: colors.foreground,
            marginBottom: '8px',
          }}>
            ${transaction.amount.toFixed(2)}
          </p>
          <div style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 600,
            color: colors.white,
            backgroundColor: getStatusColor(),
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {transaction.status}
          </div>
        </div>
      </div>
    </NeumorphicCard>
  );
};

export default function BillingHistoryScreen() {
  const router = useRouter();
  const { user } = useUser();

  // Fetch purchase history from Convex
  const purchases = useQuery(
    api.payments.getRecentPurchases,
    user?.id ? { clerkId: user.id } : 'skip'
  );

  // Transform to display format
  const transactions: CreditPurchase[] = purchases?.map((p) => ({
    id: p.id as string,
    date: p.date,
    amount: p.amount,
    credits: p.credits,
    status: p.status as 'completed' | 'pending' | 'failed',
    description: p.description,
  })) || [];

  const isLoading = purchases === undefined;

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: colors.background,
    }}>
      {/* Header */}
      <header
        className="flex items-center sticky top-0 z-10"
        style={{
          gap: '15px',
          paddingTop: 'max(20px, env(safe-area-inset-top))',
          paddingBottom: '20px',
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
          borderBottom: `1px solid ${colors.silverAlpha(0.2)}`,
          backgroundColor: colors.background,
        }}
      >
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95"
          style={{
            backgroundColor: colors.background,
            boxShadow: shadows.subtle.boxShadow,
          }}
        >
          <BackIcon />
        </button>
        <h1 className="text-xl font-semibold flex-1" style={{ color: colors.foreground }}>
          Billing History
        </h1>
      </header>

      {/* Scrollable Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        {isLoading ? (
          // Loading State
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '40px 20px',
          }}>
            <p style={{ fontSize: '14px', color: colors.muted }}>
              Loading...
            </p>
          </div>
        ) : (
          <>
            {/* Summary Card */}
            <NeumorphicCard style={{
              margin: '20px',
              padding: '20px',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '8px',
                paddingBottom: '8px',
              }}>
                <span style={{ fontSize: '14px', color: colors.silverAlpha(0.8) }}>
                  Current Period
                </span>
                <span style={{ fontSize: '14px', color: colors.foreground }}>
                  Jan 1 - Jan 31, 2024
                </span>
              </div>

              <div style={{
                height: '1px',
                backgroundColor: colors.silverAlpha(0.1),
                margin: '4px 0',
              }} />

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '8px',
                paddingBottom: '8px',
              }}>
                <span style={{ fontSize: '14px', color: colors.silverAlpha(0.8) }}>
                  Next Billing Date
                </span>
                <span style={{ fontSize: '14px', color: colors.foreground }}>
                  Feb 15, 2024
                </span>
              </div>
            </NeumorphicCard>

            {/* Transactions List */}
            <div style={{ paddingLeft: '20px', paddingRight: '20px', paddingBottom: '20px' }}>
              <h3 style={{
                fontSize: '17px',
                fontWeight: 600,
                color: colors.foreground,
                marginBottom: '16px',
              }}>
                Transaction History
              </h3>

              {transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <TransactionItem key={transaction.id} transaction={transaction} />
                ))
              ) : (
                <NeumorphicCard style={{
                  padding: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}>
                  <p style={{
                    fontSize: '14px',
                    color: colors.silverAlpha(0.6),
                    lineHeight: '1.5',
                  }}>
                    No credit purchases yet. Your purchase history will appear here.
                  </p>
                </NeumorphicCard>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
