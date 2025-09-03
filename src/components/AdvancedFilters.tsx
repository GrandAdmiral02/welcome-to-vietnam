import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { X, Filter, MapPin, Heart, Users } from 'lucide-react';
import { vietnamProvinces } from '@/data/vietnamProvinces';

interface FilterSettings {
  ageRange: [number, number];
  distance: number;
  gender: string;
  location: string;
  interests: string[];
  showOnlyVerified: boolean;
  showOnlyWithPhotos: boolean;
}

interface AdvancedFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterSettings) => void;
  currentFilters: FilterSettings;
}

const popularInterests = [
  'Du lịch', 'Âm nhạc', 'Thể thao', 'Đọc sách', 'Nấu ăn',
  'Phim ảnh', 'Nhiếp ảnh', 'Yoga', 'Gym', 'Game',
  'Nghệ thuật', 'Café', 'Thú cưng', 'Thiên nhiên', 'Công nghệ'
];

export const AdvancedFilters = ({ 
  isOpen, 
  onClose, 
  onApplyFilters, 
  currentFilters 
}: AdvancedFiltersProps) => {
  const [filters, setFilters] = useState<FilterSettings>(currentFilters);
  const [customInterest, setCustomInterest] = useState('');

  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  const handleReset = () => {
    const defaultFilters: FilterSettings = {
      ageRange: [18, 65],
      distance: 50,
      gender: 'all',
      location: '',
      interests: [],
      showOnlyVerified: false,
      showOnlyWithPhotos: true
    };
    setFilters(defaultFilters);
  };

  const addInterest = (interest: string) => {
    if (!filters.interests.includes(interest)) {
      setFilters(prev => ({
        ...prev,
        interests: [...prev.interests, interest]
      }));
    }
  };

  const removeInterest = (interest: string) => {
    setFilters(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest)
    }));
  };

  const addCustomInterest = () => {
    if (customInterest.trim() && !filters.interests.includes(customInterest.trim())) {
      addInterest(customInterest.trim());
      setCustomInterest('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl gradient-text flex items-center gap-2">
            <Filter className="h-6 w-6" />
            Bộ lọc nâng cao
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Age Range */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Độ tuổi</Label>
            <div className="px-3">
              <Slider
                value={filters.ageRange}
                onValueChange={(value) => setFilters(prev => ({ ...prev, ageRange: value as [number, number] }))}
                min={18}
                max={80}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>{filters.ageRange[0]} tuổi</span>
                <span>{filters.ageRange[1]} tuổi</span>
              </div>
            </div>
          </div>

          {/* Distance */}
          <div className="space-y-4">
            <Label className="text-base font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Khoảng cách tối đa
            </Label>
            <div className="px-3">
              <Slider
                value={[filters.distance]}
                onValueChange={(value) => setFilters(prev => ({ ...prev, distance: value[0] }))}
                min={1}
                max={200}
                step={5}
                className="w-full"
              />
              <div className="text-center text-sm text-muted-foreground mt-2">
                {filters.distance} km
              </div>
            </div>
          </div>

          {/* Gender */}
          <div className="space-y-4">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Giới tính
            </Label>
            <Select 
              value={filters.gender} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, gender: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn giới tính" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="male">Nam</SelectItem>
                <SelectItem value="female">Nữ</SelectItem>
                <SelectItem value="other">Khác</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Khu vực</Label>
            <Select 
              value={filters.location} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, location: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn tỉnh/thành phố" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tất cả</SelectItem>
                {vietnamProvinces.map((province) => (
                  <SelectItem key={province} value={province}>
                    {province}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Interests */}
          <div className="space-y-4">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Sở thích
            </Label>
            
            {/* Current interests */}
            {filters.interests.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {filters.interests.map((interest) => (
                  <Badge
                    key={interest}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                    onClick={() => removeInterest(interest)}
                  >
                    {interest}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}

            {/* Popular interests */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Sở thích phổ biến:</p>
              <div className="flex flex-wrap gap-2">
                {popularInterests
                  .filter(interest => !filters.interests.includes(interest))
                  .map((interest) => (
                    <Badge
                      key={interest}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                      onClick={() => addInterest(interest)}
                    >
                      {interest}
                    </Badge>
                  ))}
              </div>
            </div>

            {/* Custom interest */}
            <div className="flex gap-2">
              <Input
                placeholder="Thêm sở thích khác..."
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCustomInterest()}
              />
              <Button onClick={addCustomInterest} size="sm">
                Thêm
              </Button>
            </div>
          </div>

          {/* Additional Options */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Tùy chọn khác</Label>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Chỉ hiển thị người dùng đã xác minh</Label>
                <p className="text-sm text-muted-foreground">
                  Hiển thị những người đã xác minh danh tính
                </p>
              </div>
              <Switch
                checked={filters.showOnlyVerified}
                onCheckedChange={(checked) => 
                  setFilters(prev => ({ ...prev, showOnlyVerified: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Chỉ hiển thị người có ảnh</Label>
                <p className="text-sm text-muted-foreground">
                  Lọc ra những hồ sơ có ít nhất 1 ảnh
                </p>
              </div>
              <Switch
                checked={filters.showOnlyWithPhotos}
                onCheckedChange={(checked) => 
                  setFilters(prev => ({ ...prev, showOnlyWithPhotos: checked }))
                }
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={handleReset} className="flex-1">
              Đặt lại
            </Button>
            <Button onClick={handleApply} className="flex-1 btn-primary">
              Áp dụng bộ lọc
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};