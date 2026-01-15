// FIXED VERSION - Replace in index.tsx

// Get next available user ID (checks freed IDs first, then uses counter)
async function getNextUserId(): Promise<string> {
  // First check for freed IDs
  const freedIdsKey = 'freed:user:ids';
  let freedIds = await kv.get(freedIdsKey) || [];
  
  // Get reserved IDs to exclude them
  const reservedIds = await kv.get('reserved:user:ids') || [];
  
  if (freedIds.length > 0) {
    // Filter out reserved IDs
    const availableFreedIds = freedIds.filter((id: number) => !reservedIds.includes(id));
    
    if (availableFreedIds.length > 0) {
      // Sort and get the smallest ID
      availableFreedIds.sort((a: number, b: number) => a - b);
      const nextId = availableFreedIds[0];
      
      // Remove from freed list
      freedIds = freedIds.filter((id: number) => id !== nextId);
      await kv.set(freedIdsKey, freedIds);
      
      const formattedId = nextId <= 999 ? String(nextId).padStart(3, '0') : String(nextId);
      console.log('Reusing freed user ID:', nextId, 'formatted:', formattedId);
      return formattedId;
    }
  }
  
  // No freed IDs available, increment counter
  const counterKey = 'counter:userId';
  let counter = await kv.get(counterKey) || 0;
  
  // Skip reserved IDs
  do {
    counter++;
  } while (reservedIds.includes(counter));
  
  await kv.set(counterKey, counter);
  const formattedCounter = counter <= 999 ? String(counter).padStart(3, '0') : String(counter);
  console.log('Generated new user ID:', counter, 'formatted:', formattedCounter);
  return formattedCounter;
}
