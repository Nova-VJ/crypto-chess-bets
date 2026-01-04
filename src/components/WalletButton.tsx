import { motion } from 'framer-motion';
import { Wallet, ChevronDown, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useWallet } from '@/hooks/useWallet';

const WalletButton = () => {
  const {
    isConnected,
    isConnecting,
    address,
    balance,
    chainId,
    connect,
    disconnect,
    refreshBalance,
    hasMetaMask,
  } = useWallet();

  const handleConnect = async () => {
    if (!hasMetaMask) {
      toast.error('MetaMask no está instalado', {
        description: 'Instala MetaMask para continuar',
        action: {
          label: 'Instalar',
          onClick: () => window.open('https://metamask.io/download/', '_blank'),
        },
      });
      return;
    }

    const success = await connect();
    if (success) {
      toast.success('Wallet conectada correctamente');
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast.info('Wallet desconectada');
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Dirección copiada');
    }
  };

  const getNetworkName = (id: number | null) => {
    switch (id) {
      case 1: return 'Ethereum';
      case 5: return 'Goerli';
      case 11155111: return 'Sepolia';
      case 137: return 'Polygon';
      case 80001: return 'Mumbai';
      case 56: return 'BSC';
      case 42161: return 'Arbitrum';
      case 10: return 'Optimism';
      default: return `Chain ${id}`;
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: string | null) => {
    if (!bal) return '0.00';
    const num = parseFloat(bal);
    return num.toFixed(4);
  };

  if (!isConnected) {
    return (
      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        className="btn-primary-glow bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Wallet className="w-4 h-4 mr-2" />
        {isConnecting ? 'Conectando...' : 'Conectar Wallet'}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="border-primary/50 hover:border-primary gap-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-2 h-2 rounded-full bg-success"
          />
          <div className="flex flex-col items-start text-left">
            <span className="font-mono text-xs">{formatAddress(address!)}</span>
            <span className="text-[10px] text-muted-foreground">
              {formatBalance(balance)} ETH
            </span>
          </div>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-3 py-2 border-b border-border">
          <p className="text-xs text-muted-foreground mb-1">Balance</p>
          <p className="font-mono font-semibold">{formatBalance(balance)} ETH</p>
          <p className="text-xs text-muted-foreground mt-1">
            {chainId && getNetworkName(chainId)}
          </p>
        </div>
        <DropdownMenuItem onClick={copyAddress}>
          <Copy className="w-4 h-4 mr-2" />
          Copiar dirección
        </DropdownMenuItem>
        <DropdownMenuItem onClick={refreshBalance}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar balance
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            window.open(`https://etherscan.io/address/${address}`, '_blank')
          }
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Ver en Etherscan
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDisconnect} className="text-destructive">
          Desconectar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default WalletButton;
