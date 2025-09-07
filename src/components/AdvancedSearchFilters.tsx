import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Filter, X, Search } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface SearchFilters {
  searchQuery: string;
  ageMin: number;
  ageMax: number;
  maxDistance: number;
  gender: string;
  interests: string[];
}

interface AdvancedSearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: () => void;
  loading?: boolean;
}

const INTERESTS_OPTIONS = [
  'Du lịch', 'Đọc sách', 'Thể thao', 'Âm nhạc', 'Điện ảnh',
  'Nấu ăn', 'Nhiếp ảnh', 'Vẽ', 'Yoga', 'Gym', 'Bơi lội',
  'Cầu lông', 'Bóng đá', 'Game', 'Thời trang', 'Công nghệ',
  'Thiên nhiên', 'Động vật', 'Học ngoại ngữ', 'Khởi nghiệp'
];

const AdvancedSearchFilters = ({ 
  filters, 
  onFiltersChange, 
  onSearch, 
  loading = false 
}: AdvancedSearchFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const addInterest = (interest: string) => {
    if (!filters.interests.includes(interest)) {
      updateFilter('interests', [...filters.interests, interest]);
    }
  };

  const removeInterest = (interest: string) => {
    updateFilter('interests', filters.interests.filter(i => i !== interest));
  };

  const clearAllFilters = () => {
    onFiltersChange({
      searchQuery: '',
      ageMin: 18,
      ageMax: 65,
      maxDistance: 50,
      gender: 'all',
      interests: []
    });
  };

  const hasActiveFilters = () => {
    return filters.searchQuery || 
           filters.ageMin !== 18 || 
           filters.ageMax !== 65 ||
           filters.maxDistance !== 50 ||
           filters.gender !== 'all' ||
           filters.interests.length > 0;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Tìm kiếm & Lọc
                {hasActiveFilters() && (
                  <Badge variant="secondary" className="ml-2">
                    Đang lọc
                  </Badge>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm">
                {isOpen ? 'Thu gọn' : 'Mở rộng'}
              </Button>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-6 pt-4">
            <CardContent className="space-y-6 p-0">
              {/* Search Query */}
              <div className="space-y-2">
                <Label>Tìm kiếm theo tên hoặc ID</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nhập tên hoặc ID người dùng..."
                    value={filters.searchQuery}
                    onChange={(e) => updateFilter('searchQuery', e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && onSearch()}
                  />
                  <Button onClick={onSearch} disabled={loading} size="sm">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Age Range */}
              <div className="space-y-3">
                <Label>Độ tuổi: {filters.ageMin} - {filters.ageMax} tuổi</Label>
                <div className="px-2">
                  <Slider
                    value={[filters.ageMin, filters.ageMax]}
                    min={18}
                    max={65}
                    step={1}
                    onValueChange={([min, max]) => {
                      updateFilter('ageMin', min);
                      updateFilter('ageMax', max);
                    }}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label className="text-sm">Từ</Label>
                    <Input
                      type="number"
                      min="18"
                      max="65"
                      value={filters.ageMin}
                      onChange={(e) => updateFilter('ageMin', Math.max(18, Math.min(65, Number(e.target.value))))}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm">Đến</Label>
                    <Input
                      type="number"
                      min="18"
                      max="65"
                      value={filters.ageMax}
                      onChange={(e) => updateFilter('ageMax', Math.max(18, Math.min(65, Number(e.target.value))))}
                    />
                  </div>
                </div>
              </div>

              {/* Distance */}
              <div className="space-y-3">
                <Label>Khoảng cách tối đa: {filters.maxDistance} km</Label>
                <div className="px-2">
                  <Slider
                    value={[filters.maxDistance]}
                    min={5}
                    max={100}
                    step={5}
                    onValueChange={([distance]) => updateFilter('maxDistance', distance)}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Gender Filter */}
              <div className="space-y-2">
                <Label>Giới tính</Label>
                <Select value={filters.gender} onValueChange={(value) => updateFilter('gender', value)}>
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

              {/* Interests Filter */}
              <div className="space-y-3">
                <Label>Sở thích</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {INTERESTS_OPTIONS.map((interest) => (
                    <Button
                      key={interest}
                      variant={filters.interests.includes(interest) ? "default" : "outline"}
                      size="sm"
                      onClick={() => 
                        filters.interests.includes(interest) 
                          ? removeInterest(interest)
                          : addInterest(interest)
                      }
                      className="justify-start h-auto py-2 px-3"
                    >
                      {interest}
                    </Button>
                  ))}
                </div>
                
                {filters.interests.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Sở thích đã chọn:</Label>
                    <div className="flex flex-wrap gap-2">
                      {filters.interests.map((interest) => (
                        <Badge
                          key={interest}
                          variant="secondary"
                          className="gap-1 cursor-pointer"
                          onClick={() => removeInterest(interest)}
                        >
                          {interest}
                          <X className="w-3 h-3" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button onClick={onSearch} disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                      Đang tìm...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Tìm kiếm
                    </>
                  )}
                </Button>
                {hasActiveFilters() && (
                  <Button variant="outline" onClick={clearAllFilters}>
                    Xóa bộ lọc
                  </Button>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>
    </Card>
  );
};

export default AdvancedSearchFilters;