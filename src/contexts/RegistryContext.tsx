import { createContext, useContext } from 'react';
import { ContextRegistry } from '../types/contexts/registry';

const RegistryContext = createContext<ContextRegistry | null>(null);

export function RegistryProvider({ 
  children,
  value 
}: { 
  children: React.ReactNode;
  value: ContextRegistry;
}) {
  return (
    <RegistryContext.Provider value={value}>
      {children}
    </RegistryContext.Provider>
  );
}

export function useEntity<K extends keyof ContextRegistry>(entityName: K): ContextRegistry[K] {
  const registry = useContext(RegistryContext);
  if (!registry) {
    throw new Error('useEntity must be used within RegistryProvider');
  }
  return registry[entityName];
} 