# Инструкция по добавлению фильтрации по рангам

## Что нужно изменить в `/supabase/functions/server/index.tsx`

### 1. Добавить параметр rankFilter (после строки 2595)

```typescript
const balanceRange = c.req.query('balanceRange') || '';
const rankFilter = c.req.query('rank') || ''; // 🆕 ДОБАВИТЬ ЭТУ СТРОКУ
```

### 2. Обновить console.log (строка 2597)

Заменить:
```typescript
console.log(`📋 Getting paginated users - page: ${page}, limit: ${limit}, search: \"${search}\", level: ${level}, type: ${userType}, sponsor: ${sponsorStatus}, team: ${teamSize}, balance: ${balanceRange}`);
```

На:
```typescript
console.log(`📋 Getting paginated users - page: ${page}, limit: ${limit}, search: \"${search}\", level: ${level}, type: ${userType}, sponsor: ${sponsorStatus}, team: ${teamSize}, balance: ${balanceRange}, rank: ${rankFilter}`);
```

### 3. Добавить логику фильтрации по рангу (после строки 2663, после фильтра по балансу)

```typescript
    // 🆕 Filter by rank
    if (rankFilter && rankFilter !== '') {
      console.log(`🎯 Filtering by rank: ${rankFilter}`);
      
      const ranksPromises = filteredUsers.map(async (u: any) => {
        if (u.__type === 'admin' || u.isAdmin) {
          return { user: u, rank: null };
        }
        try {
          const rank = await calculateRank(u.id);
          return { user: u, rank };
        } catch (error) {
          console.error(`Error calculating rank for user ${u.id}:`, error);
          return { user: u, rank: 0 };
        }
      });
      
      const usersWithRanks = await Promise.all(ranksPromises);
      
      filteredUsers = usersWithRanks.filter(({ user, rank }) => {
        if (user.__type === 'admin' || user.isAdmin) return false;
        if (rank === null) return false;
        
        // Точное совпадение для 0-10
        if (rankFilter >= '0' && rankFilter <= '10') {
          return rank === parseInt(rankFilter);
        }
        
        // Диапазоны
        if (rankFilter === '10-20') return rank > 10 && rank <= 20;
        if (rankFilter === '20-30') return rank > 20 && rank <= 30;
        if (rankFilter === '30-40') return rank > 30 && rank <= 40;
        if (rankFilter === '40-50') return rank > 40 && rank <= 50;
        if (rankFilter === '50-60') return rank > 50 && rank <= 60;
        if (rankFilter === '60-70') return rank > 60 && rank <= 70;
        if (rankFilter === '70-80') return rank > 70 && rank <= 80;
        if (rankFilter === '80-90') return rank > 80 && rank <= 90;
        if (rankFilter === '90-100') return rank > 90 && rank <= 100;
        if (rankFilter === '100+') return rank > 100;
        
        return true;
      }).map(({ user }) => user);
      
      console.log(`✅ Filtered to ${filteredUsers.length} users after rank filter`);
    }
```

## Где именно вставить код

Фильтр по рангу должен быть вставлен **после фильтра по балансу** (строка 2663) и **перед фильтром по поисковому запросу** (строка 2665).

Структура должна выглядеть так:

```
... балансовый фильтр ...
}

// 🆕 Filter by rank
if (rankFilter && rankFilter !== '') {
  ... код фильтрации по рангу ...
}

// Filter by search query
if (search) {
  ... поисковый фильтр ...
}
```

## После изменений

После внесения изменений сервер автоматически перезагрузится, и фильтрация по рангам заработает!
