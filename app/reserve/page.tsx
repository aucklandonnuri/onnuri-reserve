'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react';

function ReserveContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const hallId = searchParams.get('hallId');
  const hallName = searchParams.get('hallName');
  const dateFromUrl = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    userName: '',
    userPhone: '',
    purpose: '',
    date: dateFromUrl,
    startTime: '',
    endTime: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const today = new Date();
    const targetDate = new Date(formData.date);
    
    const thisYear = today.getFullYear();
    const thisMonth = today.getMonth(); 
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();

    const isFutureMonth = (targetYear > thisYear) || (targetYear === thisYear && targetMonth > thisMonth);

    if (isFutureMonth) {
      const lastDayOfThisMonth = new Date(thisYear, thisMonth + 1, 0);
      const lastSunday = new Date(lastDayOfThisMonth);
      lastSunday.setDate(lastDayOfThisMonth.getDate() - lastDayOfThisMonth.getDay());
      // 기존 로직 유지: 마지막 주 일요일 저녁 6시 오픈
      lastSunday.setHours(18, 0, 0, 0);

      if ((targetYear === thisYear && targetMonth === thisMonth + 1) || (thisMonth === 11 && targetMonth === 0)) {
        if (today < lastSunday) {
          const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
          alert(`⚠️ ${monthNames[targetMonth]} 예약은 이번 달 마지막 주일 저녁 6시부터 가능합니다.`);
          return;
        }
      } else {
        alert('⚠️ 예약은 한 달 단위로만 미리 가능합니다.');
        return;
      }
    }

    const startNum = parseInt(formData.startTime.replace(':', ''));
    const endNum = parseInt(formData.endTime.replace(':', ''));

    if (startNum >= endNum) {
      alert('❌ 마침 시간은 시작 시간보다 이후여야 합니다.');
      return;
    }

    if (!hallId) return alert('홀 정보가 누락되었습니다.');

    const startISO = `${formData.date}T${formData.startTime}:00`;
    const endISO = `${formData.date}T${formData.endTime}:00`;

    const { data: existing } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('hall_id', parseInt(hallId))
      .gte('start_time', `${formData.date}T00:00:00`)
      .lte('start_time', `${formData.date}T23:59:59`);

    const newStart = new Date(startISO).getTime();
    const newEnd = new Date(endISO).getTime();

    const isOverlapping = existing?.some(b => {
      const exStart = new Date(b.start_time).getTime();
      const exEnd = new Date(b.end_time).getTime();
      return (newStart < exEnd && newEnd > exStart);
    });

    if (isOverlapping) {
      alert('⚠️ 이미 다른 예약이 있는 시간대입니다.');
      return;
    }

    const { error } = await supabase.from('bookings').insert([{
      hall_id: parseInt(hallId),
      user_name: formData.userName,
      user_phone: formData.userPhone,
      purpose: formData.purpose,
      start_time: startISO,
      end_time: endISO,
    }]);

    if (!error) {
      alert(`${hallName} 예약이 완료되었습니다!`);
      router.push('/');
      router.refresh();
    } else {
      alert('저장 실패: ' + error.message);
    }
  };

  return (
    <main className="min-h-screen bg-white p-6 flex flex-col items-center">
      <div className="w-full max-w-md">
        <button onClick={() => router.push('/')} className="mb-6 flex items-center gap-2 text-slate-800 font-black">
          <ArrowLeft size={20} /> 현황판으로 가기
        </button>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-2 border-slate-100">
          <h2 className="text-3xl font-black text-slate-900 mb-2 text-center">
            <span className="text-blue-700">{hallName}</span> 예약
          </h2>
          <p className="text-center text-slate-600 text-sm mb-8 font-bold">
            정보를 정확히 입력해 주세요.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* [수정] 사용 목적을 가장 위로 올리고 강조함 */}
              <div>
                <label className="block text-sm font-black text-blue-700 mb-2 ml-1 text-lg">✨ 사용 목적 (가장 중요)</label>
                <input required type="text" placeholder="예: 주일학교 모임, 성가대 연습" 
                  className="w-full p-5 bg-blue-50 border-2 border-blue-200 rounded-2xl font-black text-slate-900 placeholder:text-slate-400 text-lg outline-none focus:border-blue-600 shadow-sm" 
                  onChange={e => setFormData({...formData, purpose: e.target.value})} />
              </div>

              {/* 예약자 정보는 아래로 배치 */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-black text-slate-800 mb-2 ml-1 text-lg">예약자 성함</label>
                  <input required type="text" placeholder="성함을 입력하세요" 
                    className="w-full p-5 bg-slate-100 border-2 border-slate-200 rounded-2xl font-black text-slate-900 placeholder:text-slate-400 text-lg outline-none focus:border-blue-600" 
                    onChange={e => setFormData({...formData, userName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-800 mb-2 ml-1 text-lg">연락처</label>
                  <input required type="tel" placeholder="010-0000-0000" 
                    className="w-full p-5 bg-slate-100 border-2 border-slate-200 rounded-2xl font-black text-slate-900 placeholder:text-slate-400 text-lg outline-none focus:border-blue-600" 
                    onChange={e => setFormData({...formData, userPhone: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-200 space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-black text-slate-800 ml-1">날짜</span>
                <input required type="date" value={formData.date} className="w-full p-3 bg-white border-2 border-slate-300 rounded-xl font-black text-slate-900 text-lg" 
                  onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-black text-slate-800 ml-1">시작</span>
                  <input required type="time" className="w-full p-3 bg-white border-2 border-slate-300 rounded-xl font-black text-slate-900 text-lg uppercase" 
                    onChange={e => setFormData({...formData, startTime: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-black text-slate-800 ml-1">종료</span>
                  <input required type="time" className="w-full p-3 bg-white border-2 border-slate-300 rounded-xl font-black text-slate-900 text-lg uppercase" 
                    onChange={e => setFormData({...formData, endTime: e.target.value})} />
                </div>
              </div>
            </div>

            <button type="submit" className="w-full py-6 bg-blue-700 text-white rounded-[2rem] font-black text-2xl shadow-xl mt-4 active:scale-95 transition-all">
              예약 신청하기
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function ReservePage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-black text-slate-900">시스템 로딩 중...</div>}>
      <ReserveContent />
    </Suspense>
  );
}