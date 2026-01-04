import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, ChevronDown, Check, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface WalletButtonProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
}

const WalletButton = ({ onConnect, onDisconnect }: WalletButtonProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    
    // Simulate wallet connection
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    const mockAddress = '0x' + Math.random().toString(16).slice(2, 10) + '...' + Math.random().toString(16).slice(2, 6);
    setAddress(mockAddress);
    setIsConnected(true);
    setIsConnecting(false);
    onConnect?.(mockAddress);
    toast.success('Wallet conectada correctamente');
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setAddress(null);
    onDisconnect?.();
    toast.info('Wallet desconectada');
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Dirección copiada');
    }
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
        <Button variant="outline" className="border-primary/50 hover:border-primary">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-2 h-2 rounded-full bg-success mr-2"
          />
          <span className="font-mono text-sm">{address}</span>
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={copyAddress}>
          <Copy className="w-4 h-4 mr-2" />
          Copiar dirección
        </DropdownMenuItem>
        <DropdownMenuItem>
          <ExternalLink className="w-4 h-4 mr-2" />
          Ver en Explorer
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
