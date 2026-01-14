import { BookOpen, Users, TrendingUp, Play, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

export function Training() {
  const courses = [
    {
      id: 1,
      title: 'Introduction to Hydrogen',
      description: 'Learn about the benefits of molecular hydrogen and how our products can improve health and wellness.',
      icon: BookOpen,
      duration: '45 min',
      modules: 6,
      color: '#3FB7FF',
    },
    {
      id: 2,
      title: 'How to Build Your Team',
      description: 'Master the art of network building, recruiting strategies, and team management for sustainable growth.',
      icon: Users,
      duration: '60 min',
      modules: 8,
      color: '#22C55E',
    },
    {
      id: 3,
      title: 'Compensation Plan Explained',
      description: 'Deep dive into our multi-level compensation structure and learn how to maximize your earnings.',
      icon: TrendingUp,
      duration: '30 min',
      modules: 4,
      color: '#F59E0B',
    },
  ];
  
  return (
    <div className="p-8">
      <h1 className="text-[#222] mb-8" style={{ fontSize: '32px', fontWeight: '600' }}>
        Training & Resources
      </h1>
      
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm mb-8 bg-gradient-to-r from-[#3FB7FF] to-[#2A9FE8]">
        <CardHeader>
          <CardTitle className="text-white">Welcome to Hydrogen Academy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white opacity-90 mb-4">
            Invest in your success. Our comprehensive training program will help you master product knowledge, 
            sales techniques, and team building strategies.
          </p>
          <div className="flex gap-4">
            <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-white opacity-90">Total Courses</div>
              <div className="text-white mt-1" style={{ fontSize: '24px', fontWeight: '700' }}>
                {courses.length}
              </div>
            </div>
            <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-white opacity-90">Total Modules</div>
              <div className="text-white mt-1" style={{ fontSize: '24px', fontWeight: '700' }}>
                {courses.reduce((sum, c) => sum + c.modules, 0)}
              </div>
            </div>
            <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-white opacity-90">Total Duration</div>
              <div className="text-white mt-1" style={{ fontSize: '24px', fontWeight: '700' }}>
                {courses.reduce((sum, c) => sum + parseInt(c.duration), 0)} min
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid gap-6">
        {courses.map((course) => {
          const Icon = course.icon;
          
          return (
            <Card key={course.id} className="border-[#E6E9EE] rounded-2xl shadow-sm hover:shadow-xl transition-all">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: course.color + '20' }}
                  >
                    <Icon size={32} style={{ color: course.color }} />
                  </div>
                  
                  <div className="flex-1">
                    <CardTitle className="text-[#222]">{course.title}</CardTitle>
                    <p className="text-[#666] mt-2">{course.description}</p>
                    
                    <div className="flex gap-4 mt-4">
                      <div className="flex items-center gap-2 text-[#666]">
                        <Play size={16} />
                        <span>{course.modules} modules</span>
                      </div>
                      <div className="flex items-center gap-2 text-[#666]">
                        <BookOpen size={16} />
                        <span>{course.duration}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Button 
                      className="bg-[#3FB7FF] hover:bg-[#2A9FE8] text-white"
                      style={{ fontWeight: '600' }}
                    >
                      <Play size={16} className="mr-2" />
                      Start Course
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-[#E6E9EE]"
                    >
                      <Download size={16} className="mr-2" />
                      Materials
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
      
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm mt-8">
        <CardHeader>
          <CardTitle className="text-[#222]">Additional Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 border border-[#E6E9EE] rounded-xl hover:border-[#3FB7FF] transition-all cursor-pointer">
              <div className="text-[#222]" style={{ fontWeight: '600' }}>Product Catalog</div>
              <p className="text-[#666] mt-1">Download the complete product catalog with pricing and specifications.</p>
            </div>
            
            <div className="p-4 border border-[#E6E9EE] rounded-xl hover:border-[#3FB7FF] transition-all cursor-pointer">
              <div className="text-[#222]" style={{ fontWeight: '600' }}>Marketing Materials</div>
              <p className="text-[#666] mt-1">Access logos, banners, and promotional content for your campaigns.</p>
            </div>
            
            <div className="p-4 border border-[#E6E9EE] rounded-xl hover:border-[#3FB7FF] transition-all cursor-pointer">
              <div className="text-[#222]" style={{ fontWeight: '600' }}>FAQ & Support</div>
              <p className="text-[#666] mt-1">Find answers to common questions and contact support team.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
