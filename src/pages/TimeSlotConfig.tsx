import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Trash2, Save, Coffee } from 'lucide-react';
import { TimeSlot } from '@/types/school';
import { useSchoolData } from '@/context/SchoolDataContext';
import { toast } from 'sonner';

const TimeSlotConfig = () => {
  const { weekdaySlots: savedWeekday, saturdaySlots: savedSaturday, isSaturdayHalfDay: savedHalfDay, setWeekdaySlots: saveWeekday, setSaturdaySlots: saveSaturday, setIsSaturdayHalfDay: saveHalfDay } = useSchoolData();

  const [weekdaySlots, setWeekdaySlots] = useState<TimeSlot[]>(savedWeekday);
  const [saturdaySlots, setSaturdaySlots] = useState<TimeSlot[]>(savedSaturday);
  const [isSaturdayHalfDay, setIsSaturdayHalfDay] = useState(savedHalfDay);

  const handleSave = () => {
    saveWeekday(weekdaySlots);
    saveSaturday(saturdaySlots);
    saveHalfDay(isSaturdayHalfDay);
    toast.success('Time slots saved! Changes will apply to future timetable generation.');
  };

  const addSlot = (type: 'weekday' | 'saturday') => {
    const slots = type === 'weekday' ? weekdaySlots : saturdaySlots;
    const setSlots = type === 'weekday' ? setWeekdaySlots : setSaturdaySlots;
    const maxPeriod = Math.max(...slots.filter(s => !s.isBreak).map(s => s.periodNumber), 0);
    setSlots([...slots, { periodNumber: maxPeriod + 1, startTime: '', endTime: '' }]);
  };

  const addBreak = (type: 'weekday' | 'saturday') => {
    const slots = type === 'weekday' ? weekdaySlots : saturdaySlots;
    const setSlots = type === 'weekday' ? setWeekdaySlots : setSaturdaySlots;
    setSlots([...slots, { periodNumber: 0, startTime: '', endTime: '', isBreak: true, label: 'Break' }]);
  };

  const removeSlot = (type: 'weekday' | 'saturday', index: number) => {
    const setSlots = type === 'weekday' ? setWeekdaySlots : setSaturdaySlots;
    const slots = type === 'weekday' ? weekdaySlots : saturdaySlots;
    setSlots(slots.filter((_, i) => i !== index));
  };

  const updateSlot = (type: 'weekday' | 'saturday', index: number, field: keyof TimeSlot, value: string) => {
    const setSlots = type === 'weekday' ? setWeekdaySlots : setSaturdaySlots;
    const slots = type === 'weekday' ? [...weekdaySlots] : [...saturdaySlots];
    (slots[index] as any)[field] = value;
    setSlots(slots);
  };

  const renderSlotEditor = (slots: TimeSlot[], type: 'weekday' | 'saturday') => (
    <div className="space-y-2">
      {slots.map((slot, index) => (
        <div
          key={index}
          className={`flex items-center gap-3 p-3 rounded-lg border transition-all animate-fade-in ${
            slot.isBreak ? 'bg-accent/5 border-accent/20' : 'bg-card border-border hover:border-primary/20'
          }`}
        >
          {slot.isBreak ? (
            <Coffee className="h-4 w-4 text-accent shrink-0" />
          ) : (
            <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">P{slot.periodNumber}</span>
            </div>
          )}

          {slot.isBreak && (
            <Input
              value={slot.label || ''}
              onChange={(e) => updateSlot(type, index, 'label', e.target.value)}
              placeholder="Break label"
              className="h-8 text-sm w-32"
            />
          )}

          <Input
            type="time"
            value={slot.startTime}
            onChange={(e) => updateSlot(type, index, 'startTime', e.target.value)}
            className="h-8 text-sm w-28"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="time"
            value={slot.endTime}
            onChange={(e) => updateSlot(type, index, 'endTime', e.target.value)}
            className="h-8 text-sm w-28"
          />

          {slot.isBreak && (
            <Badge variant="outline" className="border-accent/30 text-accent text-[10px]">Break</Badge>
          )}

          <button
            onClick={() => removeSlot(type, index)}
            className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={() => addSlot(type)} className="text-xs">
          <Plus className="h-3 w-3 mr-1" /> Add Period
        </Button>
        <Button variant="outline" size="sm" onClick={() => addBreak(type)} className="text-xs">
          <Coffee className="h-3 w-3 mr-1" /> Add Break
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Time Slot Configuration</h1>
          <p className="text-sm text-muted-foreground mt-1">Define school-wide period timings for weekdays and Saturday</p>
        </div>
        <Button className="gap-2" onClick={handleSave}>
          <Save className="h-4 w-4" /> Save Template
        </Button>
      </div>

      <Card className="glass-card">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <Label className="text-sm font-medium">Saturday Half-Day</Label>
              <p className="text-xs text-muted-foreground">Saturday uses fewer periods than weekdays</p>
            </div>
          </div>
          <Switch checked={isSaturdayHalfDay} onCheckedChange={setIsSaturdayHalfDay} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              Weekday Slots (Mon–Fri)
            </CardTitle>
          </CardHeader>
          <CardContent>{renderSlotEditor(weekdaySlots, 'weekday')}</CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent" />
              Saturday Slots
              {isSaturdayHalfDay && <Badge variant="outline" className="text-[10px] border-accent/30 text-accent">Half Day</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>{renderSlotEditor(saturdaySlots, 'saturday')}</CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TimeSlotConfig;
