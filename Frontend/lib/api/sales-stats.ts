const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export type SalesStatsGroupBy = "category" | "region" | "period"
export type SalesStatsPeriod = "day" | "week" | "month"

export interface SalesStatsSeriesItem {
  id: number | null
  label: string
  revenue: number
  orders: number
  percentage: number
}

export interface SalesStatsResponse {
  group_by: SalesStatsGroupBy
  total_revenue: number
  total_orders: number
  series: SalesStatsSeriesItem[]
}

export interface SalesStatsParams {
  group_by: SalesStatsGroupBy
  date_from: string // Format: YYYY-MM-DD
  date_to: string // Format: YYYY-MM-DD
  period?: SalesStatsPeriod // Required only when group_by is "period"
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    data.error &&
    typeof data.error === "object" &&
    "message" in data.error &&
    typeof data.error.message === "string"
  ) {
    return data.error.message
  }

  if (
    data &&
    typeof data === "object" &&
    "detail" in data &&
    typeof data.detail === "string"
  ) {
    return data.detail
  }

  return fallback
}

export async function getSalesStats(
  params: SalesStatsParams
): Promise<SalesStatsResponse> {
  const queryParams = new URLSearchParams({
    group_by: params.group_by,
    date_from: params.date_from,
    date_to: params.date_to,
  })

  if (params.period) {
    queryParams.append("period", params.period)
  }

  const response = await fetch(
    `${API_URL}/api/v1/admin/stats/sales?${queryParams.toString()}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    }
  )

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Nu am putut încărca statisticile."))
  }

  return data as SalesStatsResponse
}
