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

const STATUS_STYLES: Record<string, { bg: string; label: string }> = {
  completed: { bg: 'var(--color-success)', label: 'Completed' },
  pending: { bg: 'var(--color-warning)', label: 'Pending' },
  failed: { bg: 'var(--color-error)', label: 'Failed' },
};

const TransactionItem: React.FC<{ transaction: CreditPurchase }> = ({ transaction }) => {
  const statusStyle = STATUS_STYLES[transaction.status] ?? STATUS_STYLES.completed;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      className="glass"
      style={{
        marginBottom: '12px',
        padding: '16px',
        borderRadius: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Left Side */}
        <div style={{ flex: 1 }}>
          <p style={{
            fontSize: '11px',
            color: 'var(--color-text-tertiary)',
            marginBottom: '4px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
          }}>
            {formatDate(transaction.date)}
          </p>
          <p style={{
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            marginBottom: '4px',
            lineHeight: '1.4',
          }}>
            {transaction.description}
          </p>
          <p style={{
            fontSize: '13px',
            color: 'var(--color-primary)',
            fontWeight: 600,
          }}>
            +{transaction.credits} credits
          </p>
        </div>

        {/* Right Side */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          marginLeft: '16px',
          gap: '8px',
        }}>
          <p style={{
            fontSize: '17px',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
          }}>
            ${transaction.amount.toFixed(2)}
          </p>
          <div style={{
            paddingTop: '3px',
            paddingBottom: '3px',
            paddingLeft: '10px',
            paddingRight: '10px',
            borderRadius: '99px',
            fontSize: '10px',
            fontWeight: 700,
            color: '#FFFFFF',
            backgroundColor: statusStyle.bg,
            letterSpacing: '0.3px',
          }}>
            {statusStyle.label}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function BillingHistoryScreen() {
  const router = useRouter();
  const { user } = useUser();

  const purchases = useQuery(
    api.payments.getRecentPurchases,
    user?.id ? { clerkId: user.id } : 'skip'
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transactions: CreditPurchase[] = purchases?.map((p: any) => ({
    id: p.id as string,
    date: p.date,
    amount: p.amount,
    credits: p.credits,
    status: p.status as 'completed' | 'pending' | 'failed',
    description: p.description,
  })) || [];

  const isLoading = purchases === undefined;

  return (
    <div
      className="glass-page"
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Glass Header */}
      <header
        className="flex items-center glass-strong"
        style={{
          gap: '15px',
          paddingTop: 'max(20px, env(safe-area-inset-top))',
          paddingBottom: '20px',
          paddingLeft: 'max(20px, env(safe-area-inset-left))',
          paddingRight: 'max(20px, env(safe-area-inset-right))',
          borderBottom: '1px solid var(--glass-border)',
          borderRadius: 0,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 glass"
          aria-label="Go back"
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
        paddingLeft: 'max(20px, env(safe-area-inset-left))',
        paddingRight: 'max(20px, env(safe-area-inset-right))',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        paddingTop: '20px',
      }}>
        {isLoading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '60px 20px',
            gap: '16px',
          }}>
            <div
              className="animate-spin"
              style={{
                width: '36px',
                height: '36px',
                border: '3px solid var(--glass-border)',
                borderTopColor: 'var(--color-primary)',
                borderRadius: '50%',
              }}
            />
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Loading transactions...
            </p>
          </div>
        ) : (
          <>
            <h3 style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-tertiary)',
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
            }}>
              Transaction History
            </h3>

            {transactions.length > 0 ? (
              transactions.map((transaction) => (
                <TransactionItem key={transaction.id} transaction={transaction} />
              ))
            ) : (
              <div
                className="glass"
                style={{
                  padding: '40px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  borderRadius: '20px',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--color-primary-alpha)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                  }}
                >
                  💳
                </div>
                <p style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                }}>
                  No transactions yet
                </p>
                <p style={{
                  fontSize: '13px',
                  color: 'var(--color-text-tertiary)',
                  lineHeight: '1.5',
                }}>
                  Your credit purchase history will appear here.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
