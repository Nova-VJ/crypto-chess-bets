import { motion } from 'framer-motion';
import { Gamepad2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import WalletButton from './WalletButton';

const AppHeader = () => {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 glass-card border-t-0 rounded-t-none safe-area-top"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <motion.div
            whileHover={{ rotate: 15 }}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center"
          >
            <Gamepad2 className="w-5 h-5 text-primary-foreground" />
          </motion.div>
          <span className="font-serif text-lg font-bold gradient-text">
            GameBet
          </span>
        </Link>

        <WalletButton />
      </div>
    </motion.header>
  );
};

export default AppHeader;
