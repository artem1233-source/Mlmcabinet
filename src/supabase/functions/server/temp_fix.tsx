// Temporary file with fixed getNextUserId function
async function getNextUserId(): Promise<string> {
  const freedIdsKey = 'freed:user:ids';
  let freedIds = await kv.get(freedIdsKey) || [];
  const reservedIds = await kv.get('reserved:user:ids') || [];
  
  if (freedIds.length > 0) {
    const availableFreedIds = freedIds.filter((id: number) => !reservedIds.includes(id));
    if (availableFreedIds.length > 0) {
      availableFreedIds.sort((a: number, b: number) => a - b);
      const nextId = availableFreedIds[0];
      freedIds = freedIds.filter((id: number) => id !== nextId);
      await kv.set(freedIdsKey, freedIds);
      const formattedId = nextId <= 999 ? String(nextId).padStart(3, '0') : String(nextId);
      console.log('Reusing freed user ID:', nextId, 'formatted:', formattedId);
      return formattedId;
    }
  }
  
  const counterKey = 'counter:userId';
  let counter = await kv.get(counterKey) || 0;
  do {
    counter++;
  } while (reservedIds.includes(counter));
  await kv.set(counterKey, counter);
  const formattedCounter = counter <= 999 ? String(counter).padStart(3, '0') : String(counter);
  console.log('Generated new user ID:', counter, 'formatted:', formattedCounter);
  return formattedCounter;
}

// LINE_157: console.log('Reusing freed user ID:', nextId, 'formatted:', formattedId);
// LINE_173: console.log('Generated new user ID:', counter, 'formatted:', formattedCounter);
