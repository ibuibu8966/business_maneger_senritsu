import type { Prisma } from "@/generated/prisma/client"

type Tx = Prisma.TransactionClient

/**
 * @deprecated 複式簿記版では廃止。
 *
 * 旧スキーマでは取引時点残高（AccountTransaction.balanceAfter）を再計算していたが、
 * 新スキーマでは balanceAfter フィールド自体が削除された。
 * 残高は AccountBalanceSnapshot（日次キャッシュ）+ それ以降の取引の SUM で都度計算する。
 *
 * 関数本体は no-op（呼び出し側のコード書換が完了するまでの互換用）。
 * 全呼び出し箇所が削除されたら本ファイルも削除すること。
 */
export async function recomputeBalanceAfter(_tx: Tx, _accountId: string): Promise<void> {
  // no-op
}
