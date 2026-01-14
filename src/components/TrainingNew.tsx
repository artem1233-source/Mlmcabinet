import { BookOpen, Users, TrendingUp, Play, Download, X, Droplet, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { useState } from 'react';

export function TrainingNew() {
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  
  const courses = [
    {
      id: 1,
      title: 'Hydrogen Science',
      description: 'Learn about the benefits of molecular hydrogen and how our products can improve health and wellness. Understand the science behind hydrogen water and its therapeutic effects.',
      icon: Droplet,
      duration: '45 min',
      modules: 6,
      color: '#39B7FF',
      lessons: [
        'Introduction to Molecular Hydrogen',
        'Health Benefits of H2 Water',
        'Scientific Research & Studies',
        'Product Technology Overview',
        'Usage Guidelines & Best Practices',
        'Q&A and Common Questions'
      ]
    },
    {
      id: 2,
      title: 'Building a Team',
      description: 'Master the art of network building, recruiting strategies, and team management for sustainable growth. Learn effective communication and leadership skills.',
      icon: Users,
      duration: '60 min',
      modules: 8,
      color: '#12C9B6',
      lessons: [
        'Network Marketing Fundamentals',
        'Finding the Right Partners',
        'Effective Communication Techniques',
        'Team Building Strategies',
        'Leadership & Motivation',
        'Handling Objections',
        'Team Training & Development',
        'Scaling Your Network'
      ]
    },
    {
      id: 3,
      title: 'Financial Plan',
      description: 'Deep dive into our multi-level compensation structure and learn how to maximize your earnings. Understand commission calculations and bonus opportunities.',
      icon: Award,
      duration: '30 min',
      modules: 4,
      color: '#F59E0B',
      lessons: [
        'Commission Structure Explained',
        'Level-based Pricing & Margins',
        'Bonus Programs & Incentives',
        'Maximizing Your Income'
      ]
    },
  ];
  
  return (
    <div className="p-8" style={{ backgroundColor: '#F7FAFC' }}>
      <h1 className="text-[#222] mb-8" style={{ fontSize: '32px', fontWeight: '700' }}>
        Training & Resources
      </h1>
      
      <Card className="border-0 rounded-2xl shadow-sm mb-8 bg-gradient-to-r from-[#39B7FF] to-[#12C9B6]">
        <CardHeader>
          <CardTitle className="text-white">Welcome to Santa Maria Academy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white opacity-90 mb-4">
            Invest in your success. Our comprehensive training program will help you master product knowledge, 
            sales techniques, and team building strategies.
          </p>
          <div className="flex gap-4">
            <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-white opacity-90">Total Courses</div>
              <div className="text-white mt-1" style={{ fontSize: '28px', fontWeight: '700' }}>
                {courses.length}
              </div>
            </div>
            <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-white opacity-90">Total Modules</div>
              <div className="text-white mt-1" style={{ fontSize: '28px', fontWeight: '700' }}>
                {courses.reduce((sum, c) => sum + c.modules, 0)}
              </div>
            </div>
            <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-white opacity-90">Total Duration</div>
              <div className="text-white mt-1" style={{ fontSize: '28px', fontWeight: '700' }}>
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
            <Card key={course.id} className="border-[#E6E9EE] rounded-2xl shadow-sm hover:shadow-xl transition-all bg-white">
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
                      className="bg-[#39B7FF] hover:bg-[#2A9FE8] text-white"
                      style={{ fontWeight: '600' }}
                      onClick={() => setSelectedLesson(course)}
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
      
      <Card className="border-[#E6E9EE] rounded-2xl shadow-sm mt-8 bg-white">
        <CardHeader>
          <CardTitle className="text-[#222]">Additional Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 border border-[#E6E9EE] rounded-xl hover:border-[#39B7FF] transition-all cursor-pointer">
              <div className="text-[#222]" style={{ fontWeight: '600' }}>Product Catalog</div>
              <p className="text-[#666] mt-1">Download the complete product catalog with pricing and specifications.</p>
            </div>
            
            <div className="p-4 border border-[#E6E9EE] rounded-xl hover:border-[#39B7FF] transition-all cursor-pointer">
              <div className="text-[#222]" style={{ fontWeight: '600' }}>Marketing Materials</div>
              <p className="text-[#666] mt-1">Access logos, banners, and promotional content for your campaigns.</p>
            </div>
            
            <div className="p-4 border border-[#E6E9EE] rounded-xl hover:border-[#39B7FF] transition-all cursor-pointer">
              <div className="text-[#222]" style={{ fontWeight: '600' }}>FAQ & Support</div>
              <p className="text-[#666] mt-1">Find answers to common questions and contact support team.</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={!!selectedLesson} onOpenChange={() => setSelectedLesson(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-[#222] flex items-center gap-3">
              {selectedLesson && (() => {
                const Icon = selectedLesson.icon;
                return (
                  <>
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: selectedLesson.color + '20' }}
                    >
                      <Icon size={20} style={{ color: selectedLesson.color }} />
                    </div>
                    {selectedLesson.title}
                  </>
                );
              })()}
            </DialogTitle>
            <DialogDescription>
              Explore the course modules and start learning to grow your business.
            </DialogDescription>
          </DialogHeader>
          
          {selectedLesson && (
            <div className="space-y-4">
              <p className="text-[#666]">{selectedLesson.description}</p>
              
              <div>
                <h3 className="text-[#222] mb-3" style={{ fontWeight: '600' }}>Course Modules:</h3>
                <div className="space-y-2">
                  {selectedLesson.lessons.map((lesson: string, index: number) => (
                    <div 
                      key={index}
                      className="flex items-center gap-3 p-3 bg-[#F7FAFC] rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
                    >
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: selectedLesson.color + '20' }}
                      >
                        <span style={{ color: selectedLesson.color, fontWeight: '700' }}>
                          {index + 1}
                        </span>
                      </div>
                      <span className="text-[#222]" style={{ fontWeight: '500' }}>{lesson}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <Button 
                className="w-full bg-[#39B7FF] hover:bg-[#2A9FE8] text-white"
                style={{ fontWeight: '600' }}
              >
                <Play size={18} className="mr-2" />
                Start Learning
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
