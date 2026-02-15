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
    
    // 1. [예약 오픈 기간 제한] 매월 마지막 주일 저녁 6시 오픈 로직
    const today = new Date();
    const targetDate = new Date(formData.date);
    
    const thisYear = today.getFullYear();
    const thisMonth = today.getMonth(); 
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();

    // 이번 달보다 미래의 예약을 시도하는지 체크
    const isFutureMonth = (targetYear > thisYear) || (targetYear === thisYear && targetMonth > thisMonth);

    if (isFutureMonth) {
      const lastDayOfThisMonth = new Date(thisYear, thisMonth + 1, 0);
      const lastSunday = new Date(lastDayOfThisMonth);
      lastSunday.setDate(lastDayOfThisMonth.getDate() - lastDayOfThisMonth.getDay());
      lastSunday.setHours(18, 0, 0, 0); // 저녁 6시 설정

      // 다음 달 예약인데 아직 오픈 전인 경우
      if ((targetYear === thisYear && targetMonth === thisMonth + 1) || (thisMonth === 11 && targetMonth === 0)) {
        if (today < lastSunday) {
          const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
          alert(`⚠️ ${monthNames[targetMonth]} 예약은 이번 달 마지막 주일(5일 전후) 저녁 6시부터 가능합니다.`);
          return;
        }
      } 
      // 두 달 뒤 이상인 경우 무조건 차단
      else {
        alert('⚠️ 예약은 한 달 단위로만 미리 가능합니다.');
        return;
      }
    }

    // 2. [시간 역전 방지] 숫자로 변환하여 비교
    const startNum = parseInt(formData.startTime.replace(':', ''));
    const endNum = parseInt(formData.endTime.replace(':', ''));

    if (startNum >= endNum) {
      alert('❌ 마침 시간은 시작 시간보다 이후여야 합니다.');
      return;
    }

    if (!hallId) return alert('홀 정보가 누락되었습니다.');

    const startISO = `${formData.date}T${formData.startTime}:00`;
    const endISO = `${formData.date}T${formData.endTime}:00`;

    // 3. [중복 체크] 현재 날짜의 해당 홀 예약 조회
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
      alert('⚠️ 이미 다른 예약이 있는 시간대입니다. 현황판을 확인해주세요.');
      return;
    }

    // 4. 데이터 저장
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
    <main className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-md">
        <button onClick={() => router.push('/')} className="mb-6 flex items-center gap-2 text-slate-500 font-bold">
          <ArrowLeft size={20} /> 현황판으로 가기
        </button>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
          <h2 className="text-2xl font-black text-slate-800 mb-2 text-center">
            <span className="text-blue-600">{hallName}</span> 예약하기
          </h2>
          <p className="text-center text-slate-400 text-xs mb-8 font-bold italic">
            * 다음 달 예약은 마지막 주일 저녁 6시에 오픈됩니다.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-3">
              <input required type="text" placeholder="예약자 성함" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" 
                onChange={e => setFormData({...formData, userName: e.target.value})} />
              <input required type="tel" placeholder="연락처" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" 
                onChange={e => setFormData({...formData, userPhone: e.target.value})} />
              <input required type="text" placeholder="사용 목적" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold" 
                onChange={e => setFormData({...formData, purpose: e.target.value})} />
            </div>

            <div className="pt-4 space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-400 ml-1 uppercase">Date</span>
                <input required type="date" value={formData.date} className="w-full p-4 bg-slate-50 border-none rounded-xl font-bold" 
                  onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 ml-1 uppercase">Start</span>
                  <input required type="time" className="w-full p-4 bg-slate-50 border-none rounded-xl font-bold" 
                    onChange={e => setFormData({...formData, startTime: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 ml-1 uppercase">End</span>
                  <input required type="time" className="w-full p-4 bg-slate-50 border-none rounded-xl font-bold" 
                    onChange={e => setFormData({...formData, endTime: e.target.value})} />
                </div>
              </div>
            </div>

            <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-xl shadow-lg mt-6 active:scale-95 transition-all">
              예약 확정하기
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function ReservePage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-bold">시스템 로딩 중...</div>}>
      <ReserveContent />
    </Suspense>
  );
}