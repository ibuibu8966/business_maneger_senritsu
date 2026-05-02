-- AccountTransactionType に EXPENSE 値を追加（売上の対となる支出カテゴリ）
ALTER TYPE "AccountTransactionType" ADD VALUE 'EXPENSE' AFTER 'REVENUE';
