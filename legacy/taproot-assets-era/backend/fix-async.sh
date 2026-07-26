#!/bin/bash
# Fix all async/await issues in agent-generated code

echo "Fixing async issues in RuneBolt backend..."

# Fix ChannelManager.ts - add await to all db calls
sed -i 's/this.db.createUser(userPubkey);/await this.db.createUser(userPubkey);/g' src/channels/ChannelManager.ts
sed -i 's/this.db.createChannel({/await this.db.createChannel({/g' src/channels/ChannelManager.ts
sed -i 's/const row = this.db.getChannel(channelId);/const row = await this.db.getChannel(channelId);/g' src/channels/ChannelManager.ts
sed -i 's/this.db.updateChannel({/await this.db.updateChannel({/g' src/channels/ChannelManager.ts
sed -i 's/const channels = this.db.getChannelsByPubkey(userPubkey);/const channels = await this.db.getChannelsByPubkey(userPubkey);/g' src/channels/ChannelManager.ts
sed -i 's/this.db.updateChannelState(channelId,/await this.db.updateChannelState(channelId,/g' src/channels/ChannelManager.ts

# Fix RuneLedger.ts - add await to all db calls  
sed -i 's/const fromRow = this.db.getChannel(fromChannelId);/const fromRow = await this.db.getChannel(fromChannelId);/g' src/ledger/RuneLedger.ts
sed -i 's/const toRow = this.db.getChannel(toChannelId);/const toRow = await this.db.getChannel(toChannelId);/g' src/ledger/RuneLedger.ts
sed -i 's/const row = this.db.getChannel(channelId);/const row = await this.db.getChannel(channelId);/g' src/ledger/RuneLedger.ts
sed -i 's/this.db.updateChannelBalances(fromChannelId,/await this.db.updateChannelBalances(fromChannelId,/g' src/ledger/RuneLedger.ts
sed -i 's/this.db.updateChannelBalances(toChannelId,/await this.db.updateChannelBalances(toChannelId,/g' src/ledger/RuneLedger.ts
sed -i 's/this.db.createTransfer({/await this.db.createTransfer({/g' src/ledger/RuneLedger.ts
sed -i 's/this.db.getTransfersByPubkey(pubkey,/const rows = await this.db.getTransfersByPubkey(pubkey,/g' src/ledger/RuneLedger.ts
sed -i 's/const channels = this.db.getChannelsByPubkey(pubkey);/const channels = await this.db.getChannelsByPubkey(pubkey);/g' src/ledger/RuneLedger.ts

# Fix authRoutes.ts - add await
sed -i 's/db.createUser(result.pubkey);/await db.createUser(result.pubkey);/g' src/api/routes/authRoutes.ts
sed -i 's/const user = await db.getUser(pubkey);/const user = await db.getUser(pubkey);/g' src/api/routes/authRoutes.ts

echo "Fixes applied. Now building..."
npm run build
