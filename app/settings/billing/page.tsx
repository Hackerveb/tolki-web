'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { useUser } from '@clerk/nextjs';
import { api } from '@/convex/_generated/api';

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <polyline
      points="15 18 9 12 15 6"
      stroke="var(--color-text-primary)"
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
        return 'var(--color-success)';
      case 'pending':
        return 'var(--color-warning)';
      case 'failed':
        return 'var(--color-error)';
      default:
        return 'var(--color-text-primary)';
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
    <div
      style={{
        marginBottom: '16px',
        padding: '16px',
        backgroundColor: 'var(--color-surface)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Left Side */}
        <div style={{ flex: 1 }}>
          <p style={{
            fontSize: '12px',
            color: 'var(--color-text-tertiary)',
            marginBottom: '4px',
            fontWeight: 400,
          }}>
            {formatDate(transaction.date)}
          </p>
          <p style={{
            fontSize: '14px',
            fontWeight: 400,
            color: 'var(--color-text-primary)',
            marginBottom: '2px',
            lineHeight: '1.4',
          }}>
            {transaction.description}
          </p>
          <p style={{
            fontSize: '13px',
            color: 'var(--color-primary)',
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
            color: 'var(--color-text-primary)',
            marginBottom: '8px',
          }}>
            ${transaction.amount.toFixed(2)}
          </p>
          <div style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--color-on-success)',
            backgroundColor: getStatusColor(),
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {transaction.status}
          </div>
        </div>
      </div>
    </div>
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
      backgroundColor: 'var(--color-background)',
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
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-background)',
        }}
      >
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95"
          style={{
            backgroundColor: 'var(--color-surface)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <BackIcon />
        </button>
        <h1 className="text-xl font-semibold flex-1" style={{ color: 'var(--color-text-primary)' }}>
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
          // Loading State with spinner
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '40px 20px',
            gap: '12px',
          }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                border: '2px solid var(--color-border)',
                borderTopColor: 'var(--color-primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Loading...
            </p>
            <style jsx>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : (
          <>
            {/* Transactions List */}
            <div style={{ paddingLeft: '20px', paddingRight: '20px', paddingBottom: '20px' }}>
              <h3 style={{
                fontSize: '17px',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: '16px',
              }}>
                Transaction History
              </h3>

              {transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <TransactionItem key={transaction.id} transaction={transaction} />
                ))
              ) : (
                <div style={{
                  padding: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-sm)',
                  border: '1px solid var(--color-border)',
                }}>
                  <p style={{
                    fontSize: '14px',
                    color: 'var(--color-text-tertiary)',
                    lineHeight: '1.5',
                  }}>
                    No credit purchases yet. Your purchase history will appear here.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
