import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, formatEther } from 'ethers';

interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  balance: string | null;
  chainId: number | null;
  error: string | null;
}

export const useWallet = () => {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    isConnecting: false,
    address: null,
    balance: null,
    chainId: null,
    error: null,
  });

  const getProvider = useCallback(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      return new BrowserProvider(window.ethereum);
    }
    return null;
  }, []);

  const fetchBalance = useCallback(async (address: string) => {
    const provider = getProvider();
    if (!provider) return null;
    
    try {
      const balance = await provider.getBalance(address);
      return formatEther(balance);
    } catch (err) {
      console.error('Error fetching balance:', err);
      return null;
    }
  }, [getProvider]);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setState(prev => ({ ...prev, error: 'MetaMask no está instalado' }));
      return false;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const provider = getProvider();
      if (!provider) throw new Error('Provider no disponible');

      const accounts = await provider.send('eth_requestAccounts', []);
      const address = accounts[0];
      const network = await provider.getNetwork();
      const balance = await fetchBalance(address);

      setState({
        isConnected: true,
        isConnecting: false,
        address,
        balance,
        chainId: Number(network.chainId),
        error: null,
      });

      return true;
    } catch (err: any) {
      console.error('Error connecting wallet:', err);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: err.message || 'Error al conectar wallet',
      }));
      return false;
    }
  }, [getProvider, fetchBalance]);

  const disconnect = useCallback(() => {
    setState({
      isConnected: false,
      isConnecting: false,
      address: null,
      balance: null,
      chainId: null,
      error: null,
    });
  }, []);

  const refreshBalance = useCallback(async () => {
    if (state.address) {
      const balance = await fetchBalance(state.address);
      setState(prev => ({ ...prev, balance }));
    }
  }, [state.address, fetchBalance]);

  // Listen for account and chain changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else if (accounts[0] !== state.address) {
        const balance = await fetchBalance(accounts[0]);
        setState(prev => ({
          ...prev,
          address: accounts[0],
          balance,
        }));
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const chainId = parseInt(chainIdHex, 16);
      setState(prev => ({ ...prev, chainId }));
      refreshBalance();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [state.address, disconnect, fetchBalance, refreshBalance]);

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (!window.ethereum) return;
      
      try {
        const provider = getProvider();
        if (!provider) return;

        const accounts = await provider.send('eth_accounts', []);
        if (accounts.length > 0) {
          const address = accounts[0];
          const network = await provider.getNetwork();
          const balance = await fetchBalance(address);

          setState({
            isConnected: true,
            isConnecting: false,
            address,
            balance,
            chainId: Number(network.chainId),
            error: null,
          });
        }
      } catch (err) {
        console.error('Error checking connection:', err);
      }
    };

    checkConnection();
  }, [getProvider, fetchBalance]);

  return {
    ...state,
    connect,
    disconnect,
    refreshBalance,
    hasMetaMask: typeof window !== 'undefined' && !!window.ethereum,
  };
};

// Add ethereum type to window
declare global {
  interface Window {
    ethereum?: any;
  }
}
