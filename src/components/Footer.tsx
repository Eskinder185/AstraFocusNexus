import React from 'react';

export interface FooterProps {
  children?: React.ReactNode;
}

const Footer: React.FC<FooterProps> = ({ children }) => {
  return (
    <footer className="bg-white dark:bg-gray-900 mt-auto">
      <div className="w-full py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        {children}
      </div>
    </footer>
  );
};

export default Footer;

