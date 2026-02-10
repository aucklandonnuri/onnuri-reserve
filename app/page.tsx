'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, ChevronRight, Clock, User, Phone } from 'lucide-react';
import Link from 'next/link';

interface Hall { id: number; name: string; }
interface Booking {
  id: number;
  hall_id: number;
  user_name: string;
  user_phone: string;
  start_time: string;
  end_time: string;
  purpose: string;
}

export default function Home() {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    async function fetchData() {
      const { data: hallData } = await supabase.from('halls').select('*').order('id', { ascending: true });
      if (hallData) setHalls(hallData);

      const { data: bookingData } = await supabase
        .from('bookings')
        .select('*')
        .gte('start_time', `${selectedDate}T00:00:00`)
        .lte('start_time', `${selectedDate}T23:59:59`)
        .order('start_time', { ascending: true });
      
      if (bookingData) setBookings(bookingData as Booking[]);
    }
    fetchData();
  }, [selectedDate]);

  const getHallBookings = (hallId: number) => bookings.filter(b => b.hall_id === hallId);
  const formatTime = (isoString: string) => isoString.split('T')[1].substring(0, 5);

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center p-4 pb-10">
      {/* 상단 헤더 및 날짜 선택 섹션 */}
      <div className="w-full max-w-md py-6 flex flex-col items-center sticky top-0 bg-slate-50 z-10">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">홀 예약 현황</h1>
        
        <div className="w-full flex items-center justify-between bg-white p-3 rounded-2xl shadow-md border border-slate-100">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 bg-transparent border-none text-center font-bold text-lg text-blue-600 focus:ring-0"
          />
        </div>
      </div>

      {/* 홀 리스트 현황판 */}
      <div className="w-full max-w-md space-y-6">
        {halls.map((hall) => {
          const hallBookings = getHallBookings(hall.id);
          return (
            <div key={hall.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
              {/* 각 홀의 예약 버튼: hallId와 hallName을 확실하게 전달합니다 */}
              <Link 
                href={`/reserve?hallId=${hall.id}&hallName=${encodeURIComponent(hall.name)}&date=${selectedDate}`}
                className="flex items-center justify-between p-6 border-b border-slate-50 active:bg-slate-50"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-blue-200 shadow-lg">
                    {hall.id}
                  </div>
                  <span className="font-black text-slate-800 text-xl">{hall.name}</span>
                </div>
                <div className="flex items-center text-blue-600 font-bold text-sm bg-blue-50 px-4 py-2 rounded-full">
                  예약하기 <ChevronRight size={16} />
                </div>
              </Link>

              <div className="p-5 bg-white">
                {hallBookings.length > 0 ? (
                  <div className="space-y-4">
                    {hallBookings.map((b) => (
                      <div key={b.id} className="flex flex-col gap-2 p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                        <div className="flex items-center gap-2 text-blue-700">
                          <Clock size={20} strokeWidth={3} />
                          <span className="text-xl font-black">
                            {formatTime(b.start_time)} ~ {formatTime(b.end_time)}
                          </span>
                        </div>
                        
                        <div className="mt-1 space-y-2">
                          <div className="flex items-center gap-2 text-slate-800 font-extrabold text-lg">
                            <User size={18} className="text-slate-400" />
                            {b.user_name} 성도님
                          </div>
                          <div className="text-base text-slate-600 font-medium ml-1">
                            목적: {b.purpose}
                          </div>
                          <div className="flex items-center gap-2 text-blue-600 font-bold text-base mt-2 bg-white w-fit px-3 py-1 rounded-lg shadow-sm">
                            <Phone size={16} />
                            {b.user_phone}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-300 text-base font-medium">
                    아직 예약이 없습니다.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* 하단 플로팅 버튼 섹션 삭제됨 */}
    </main>
  );
}