// smart-contract-service.js
class SmartContractService {
    constructor() {
        this.connection = new solanaWeb3.Connection('https://api.devnet.solana.com');
        this.programId = new solanaWeb3.PublicKey('37ZFkAA4NvvfEZnoKEJ8Uo5ChF3mBzTEMoqd8eijMkVs');
        this.platformWallet = new solanaWeb3.PublicKey('HmT6Nj3r24YKCxGLPfv1gSJijXyNcrPHKKeknZYGRXv');
    }

    // Create escrow when admin creates competition
    async createCompetitionEscrow(competitionId, tokenAPythId, tokenBPythId, adminWallet) {
        const wallet = await this.getConnectedWallet();
        
        // Generate escrow PDA
        const [escrowAccount, bump] = await solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from("escrow"), Buffer.from(competitionId)],
            this.programId
        );

        // Build transaction for create_escrow instruction
        const instruction = await this.createEscrowInstruction({
            competitionId,
            escrowAccount,
            bump,
            tokenAPythId,
            tokenBPythId,
            authority: adminWallet,
            platformWallet: this.platformWallet
        });

        const transaction = new solanaWeb3.Transaction().add(instruction);
        const signature = await wallet.sendTransaction(transaction, this.connection);
        await this.connection.confirmTransaction(signature);

        return {
            escrowAccount: escrowAccount.toString(),
            bump,
            signature
        };
    }

    // Place bet on competition
    async placeBet(competitionId, userWallet, tokenChoice, betAmount) {
        const wallet = await this.getConnectedWallet();
        
        const [escrowAccount] = await solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from("escrow"), Buffer.from(competitionId)],
            this.programId
        );

        const instruction = await this.placeBetInstruction({
            competitionId,
            escrowAccount,
            userWallet,
            tokenChoice, // 'A' or 'B'
            amount: betAmount * solanaWeb3.LAMPORTS_PER_SOL
        });

        const transaction = new solanaWeb3.Transaction().add(instruction);
        const signature = await wallet.sendTransaction(transaction, this.connection);
        await this.connection.confirmTransaction(signature);

        return signature;
    }

    // Start competition (sets starting prices)
    async startCompetition(competitionId, adminWallet) {
        const wallet = await this.getConnectedWallet();
        
        const [escrowAccount] = await solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from("escrow"), Buffer.from(competitionId)],
            this.programId
        );

        const instruction = await this.startCompetitionInstruction({
            competitionId,
            escrowAccount,
            authority: adminWallet
        });

        const transaction = new solanaWeb3.Transaction().add(instruction);
        const signature = await wallet.sendTransaction(transaction, this.connection);
        return signature;
    }

    // Resolve competition (sets ending prices, determines winner)
    async resolveCompetition(competitionId, adminWallet) {
        // Similar implementation for resolve_competition
    }

    // Withdraw winnings
    async withdrawWinnings(competitionId, userWallet) {
        // Similar implementation for withdraw_winnings
    }

    async getConnectedWallet() {
        const walletService = window.getWalletService();
        if (!walletService || !walletService.isConnected()) {
            throw new Error('Wallet not connected');
        }
        return walletService.walletProvider;
    }
}

// Global instance
window.smartContractService = new SmartContractService();
