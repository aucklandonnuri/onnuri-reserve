'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, Calendar as CalendarIcon, User, Info, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Booking {
  id: number;
  user_name: string;
  purpose: string;
  start_time: string;
  end_time: string;
  hall_id: number;
  halls: { name: string };
}

export default function AdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // 모든 예약 데이터 가져오기 (날짜 무관)
  const fetchAllBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        halls ( name )
      `)
      .order('start_time', { ascending: false }); // 최신순

    if (data) setBookings(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllBookings();
  }, []);

  // 예약 삭제 함수
  const handleDelete = async (id: number, userName: string) => {
    if (confirm(`${userName}님의 예약을 삭제하시겠습니까?`)) {
      const { error } = await supabase.from('bookings').delete().eq('id', id);
      if (!error) {
        alert('삭제되었습니다.');
        fetchAllBookings(); // 목록 새로고침
      } else {
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-10">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <Link href="/" className="p-2 bg-white rounded-full shadow-sm text-slate-400">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-slate-800">전체 예약 관리자</h1>
          <div className="w-10"></div>
        </header>

        {loading ? (
          <div className="text-center py-20 text-slate-400">데이터를 불러오는 중...</div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <div key={b.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md">
                      {b.halls.name}
                    </span>
                    <span className="text-sm font-bold text-slate-800">{b.user_name} 성도님</span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <CalendarIcon size={12} /> 
                   {b.start_time.split('T')[0]} | 
                    {b.start_time.split('T')[1].substring(0,5)} ~ {b.end_time.split('T')[1].substring(0,5)}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    <Info size={12} /> {b.purpose}
                  </div>
                </div>
                
                <button 
                  onClick={() => handleDelete(b.id, b.user_name)}
                  className="p-3 text-red-400 hover:bg-red-50 rounded-2xl transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            
            {bookings.length === 0 && (
              <div className="text-center py-20 text-slate-400">예약 내역이 없습니다.</div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}