'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { OBEReportGenerator } from '@/components/obe-report-generator'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import api from '@/lib/api'

type COData = {
  co: string
  attainment: number
}

export default function ReportsPage() {
  const [data, setData] = useState<COData[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchCoAttainment()
  }, [])

  const fetchCoAttainment = async () => {
    setLoading(true)
    try {
      const res = await api.get('/obe/co-attainment')
      // support either { co_attainment: [...] } or direct array
      const payload = res.data?.co_attainment ?? res.data ?? []
      const mapped: COData[] = payload.map((item: any) => ({
        co: item.co ?? item.name ?? String(item.id ?? ''),
        attainment: Number(item.attainment ?? item.percentage ?? item.value ?? 0),
      }))
      setData(mapped)
    } catch (err) {
      console.error('Failed to fetch CO attainment', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateReport = async () => {
    setGenerating(true)
    try {
      const res = await api.post('/obe/generate-report', {}, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'obe_report.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to generate report', err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <Header />
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">CO Attainment</h2>
              <div>
                <button
                  className="btn bg-primary text-white"
                  onClick={handleGenerateReport}
                  disabled={generating}
                >
                  {generating ? 'Generating...' : 'Generate PDF Report'}
                </button>
              </div>
            </div>

            <div style={{ width: '100%', height: 420 }}>
              {loading ? (
                <div>Loading...</div>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="co" />
                    <YAxis domain={[0, 100]} unit="%" />
                    <Tooltip formatter={(value: any) => `${value}%`} />
                    <Legend />
                    <Bar dataKey="attainment" name="Attainment (%)" fill="#4f46e5" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="mt-8">
              <OBEReportGenerator />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
