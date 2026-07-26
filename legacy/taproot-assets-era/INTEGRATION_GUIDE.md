# RuneBolt UX Components - Integration Guide

## Quick Start

### 1. Using the Onboarding Flow

```tsx
import { OnboardingFlow } from '@/components';
import { useState } from 'react';

export default function HomePage() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <>
      <button onClick={() => setShowOnboarding(true)}>
        Get Started
      </button>
      
      <OnboardingFlow
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={(data) => {
          console.log('User onboarded:', data);
          // Redirect to dashboard or app
        }}
      />
    </>
  );
}
```

### 2. Using Error Messages

```tsx
import { ErrorMessage, mapErrorToType } from '@/components';

// In your component
const [error, setError] = useState<string | null>(null);

// When an error occurs
const handleError = (err: Error) => {
  const errorType = mapErrorToType(err.message);
  setError(errorType);
};

// Render
{error && (
  <ErrorMessage
    error={error}
    context="inline"
    onAction={(action) => {
      if (action === 'retry') {
        // Retry the operation
      } else if (action === 'add_funds') {
        // Navigate to deposit page
      }
    }}
  />
)}
```

### 3. Using Transaction Status

```tsx
import { 
  useTransactionStatus, 
  TransactionToastContainer,
  TransactionStatusIndicator 
} from '@/components';

export default function SendPage() {
  const { transactions, addTransaction, dismissTransaction } = useTransactionStatus();
  const [currentTx, setCurrentTx] = useState<string | null>(null);

  const handleSend = async () => {
    const txId = crypto.randomUUID();
    
    // Add transaction to tracking
    addTransaction({
      id: txId,
      type: 'send',
      status: 'pending',
      amount: 1000,
      recipient: '@alice',
    });
    
    setCurrentTx(txId);
    
    // Call your API
    const response = await fetch('/api/v1/transfers', { ... });
    
    if (response.ok) {
      // WebSocket will update the status
    } else {
      // Handle error
    }
  };

  return (
    <>
      {/* Toast notifications */}
      <TransactionToastContainer
        transactions={transactions}
        onDismiss={dismissTransaction}
      />
      
      {/* Inline status indicator */}
      {currentTx && (
        <TransactionStatusIndicator
          transaction={transactions.find(t => t.id === currentTx)!}
          onClose={() => setCurrentTx(null)}
        />
      )}
      
      <button onClick={handleSend}>Send DOG</button>
    </>
  );
}
```

### 4. Using Claim Links

```tsx
import { ClaimLink } from '@/components';
import { useState } from 'react';

export default function GiftPage() {
  const [showClaimLink, setShowClaimLink] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowClaimLink(true)}>
        Create Gift Link
      </button>
      
      <ClaimLink
        isOpen={showClaimLink}
        onClose={() => setShowClaimLink(false)}
        maxBalance={125000}
        userPubkey="user_pubkey_here"
      />
    </>
  );
}
```

### 5. Using Username Resolution

```tsx
// Resolve username to pubkey
const resolveUsername = async (username: string) => {
  const response = await fetch(`/api/v1/usernames/${username}`);
  const data = await response.json();
  
  if (data.success) {
    return data.data.pubkey;
  } else {
    // Handle user-friendly error
    console.log(data.userFriendly);
  }
};

// Check username availability
const checkUsername = async (username: string) => {
  const response = await fetch(`/api/v1/usernames/check/${username}`);
  const data = await response.json();
  return data.data.available;
};

// Register username
const registerUsername = async (username: string, token: string) => {
  const response = await fetch('/api/v1/usernames/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ username }),
  });
  return response.json();
};
```

### 6. WebSocket Setup for Transaction Status

```tsx
import { useEffect, useRef } from 'react';

export default function App() {
  const wsRef = useRef<WebSocket | null>(null);
  
  useEffect(() => {
    const ws = new WebSocket('wss://api.runebolt.io/ws');
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log('Connected to RuneBolt');
      
      // Subscribe to transaction updates
      ws.send(JSON.stringify({
        type: 'subscribe_transactions',
        pubkey: 'your_pubkey',
      }));
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'transaction_update') {
        const tx = message.data;
        
        // Update your UI
        console.log(`Transaction ${tx.id} is now ${tx.status}`);
        
        if (tx.status === 'confirmed') {
          // Show success notification
        } else if (tx.status === 'failed') {
          // Show error notification
        }
      }
    };
    
    return () => {
      ws.close();
    };
  }, []);
  
  return <div>Your App</div>;
}
```

## Component Props Reference

### OnboardingFlow
| Prop | Type | Description |
|------|------|-------------|
| isOpen | boolean | Controls modal visibility |
| onClose | () => void | Called when modal closes |
| onComplete | (data) => void | Called when onboarding completes |

### ErrorMessage
| Prop | Type | Description |
|------|------|-------------|
| error | ErrorType \| string | The error type or message |
| context | 'toast' \| 'inline' \| 'page' | Display style |
| onAction | (action: string) => void | Called when user clicks action |
| technicalError | string | Technical details (optional) |

### TransactionStatusIndicator
| Prop | Type | Description |
|------|------|-------------|
| transaction | TransactionState | The transaction to display |
| onClose | () => void | Called when closed |
| showDetails | boolean | Show detailed info |
| context | 'inline' \| 'modal' \| 'page' | Display style |

### ClaimLink
| Prop | Type | Description |
|------|------|-------------|
| isOpen | boolean | Controls modal visibility |
| onClose | () => void | Called when modal closes |
| maxBalance | number | User's available balance |
| userPubkey | string | User's public key |

## Error Types

Available error types for `mapErrorToType()`:

- `wallet_not_connected`
- `connection_rejected`
- `wallet_locked`
- `network_mismatch`
- `insufficient_funds`
- `no_active_account`
- `transfer_failed`
- `recipient_not_found`
- `amount_too_small`
- `funding_pending`
- `mempool_congestion`
- `service_unavailable`
- `unknown`

## Transaction Status Types

Transaction statuses:
- `pending` - Transaction submitted, waiting for processing
- `confirming` - On-chain transaction waiting for confirmations
- `confirmed` - Transaction complete
- `failed` - Transaction failed

## Tips

1. **Error Handling**: Always use `mapErrorToType()` to convert technical errors to user-friendly ones
2. **WebSocket**: Subscribe to transaction updates as early as possible in your app lifecycle
3. **Claim Links**: Store generated claim link IDs locally so users can track them
4. **Username Validation**: Use the same regex (`/^[a-zA-Z0-9_]{3,20}$/`) on client and server
5. **Mobile**: The ClaimLink component uses native share sheets on mobile devices
