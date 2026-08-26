import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';

interface TokenLedgerEntry {
    amount: number;
    transaction_type: string;
    product: string;
    action_type: string;
    description: string;
    created_at: string;
}

interface TokenContextType {
    tokenBalance: number;
    totalConsumed: number;
    history: TokenLedgerEntry[];
    freeJobFitAvailable: boolean;
    isLoading: boolean;
    fetchTokenData: () => Promise<void>;
    canAffordTokens: (tokensRequired: number) => boolean;
    chargeTokensAfterSuccess: (actionType: string, tokensRequired: number, product?: string) => Promise<boolean>;
    showUpgradeModal: boolean;
    setShowUpgradeModal: (show: boolean) => void;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export function TokenProvider({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, user } = useAuth();
    const [tokenBalance, setTokenBalance] = useState<number>(0);
    const [totalConsumed, setTotalConsumed] = useState<number>(0);
    const [history, setHistory] = useState<TokenLedgerEntry[]>([]);
    const [freeJobFitAvailable, setFreeJobFitAvailable] = useState(true);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);

    const fetchTokenData = async () => {
        if (!isAuthenticated) return;
        setIsLoading(true);
        try {
            const response = await api.get('/api/users/tokens/');
            if (response.ok) {
                const data = await response.json();
                setTokenBalance(data.token_balance);
                setTotalConsumed(data.total_consumed);
                setHistory(data.history || []);
                setFreeJobFitAvailable(data.free_job_fit_available !== false);
            }
        } catch (error) {
            console.error('Failed to fetch token data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchTokenData();
        } else {
            // Reset for unauthenticated users
            setTokenBalance(50);
            setTotalConsumed(0);
            setHistory([]);
            setFreeJobFitAvailable(true);
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    const canAffordTokens = (tokensRequired: number) => {
        if (!isAuthenticated) {
            window.dispatchEvent(new CustomEvent('show-login-modal'));
            return false;
        }

        if (tokenBalance < tokensRequired) {
            setShowUpgradeModal(true);
            return false;
        }

        return true;
    };

    const chargeTokensAfterSuccess = async (actionType: string, tokensRequired: number, product = 'resumevibe') => {
        try {
            const requestId = `${actionType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const response = await api.post('/api/users/tokens/use/', {
                action_type: actionType,
                tokens: tokensRequired,
                product,
                request_id: requestId,
                operation_succeeded: true,
            });

            if (response.ok) {
                const data = await response.json();
                setTokenBalance(data.token_balance);
                if (typeof data.free_job_fit_available === 'boolean') {
                    setFreeJobFitAvailable(data.free_job_fit_available);
                }
                fetchTokenData();
                return true;
            } else if (response.status === 402) {
                setShowUpgradeModal(true);
                return false;
            }
            return false;
        } catch (error) {
            console.error('Failed to use tokens:', error);
            return false;
        }
    };

    return (
        <TokenContext.Provider value={{
            tokenBalance,
            totalConsumed,
            history,
            freeJobFitAvailable,
            isLoading,
            fetchTokenData,
            canAffordTokens,
            chargeTokensAfterSuccess,
            showUpgradeModal,
            setShowUpgradeModal
        }}>
            {children}
        </TokenContext.Provider>
    );
}

export function useToken() {
    const context = useContext(TokenContext);
    if (context === undefined) {
        throw new Error('useToken must be used within a TokenProvider');
    }
    return context;
}
