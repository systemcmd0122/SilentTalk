export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        {/* メインローディングアニメーション */}
        <div className="relative mb-8">
          {/* 外側のリング */}
          <div className="w-16 h-16 border-4 border-gray-200 rounded-full animate-spin border-t-blue-500 mx-auto"></div>
          {/* 内側のドット */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
        </div>
        
        {/* テキストアニメーション */}
        <div className="flex items-center justify-center space-x-1 mb-4">
          <p className="text-lg font-medium text-gray-700">読み込み中</p>
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
            <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
          </div>
        </div>
        
        {/* プログレスバー風エフェクト */}
        <div className="w-48 h-1 bg-gray-200 rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full animate-pulse"></div>
        </div>
        
        {/* 追加のビジュアルエフェクト */}
        <div className="mt-8 flex justify-center space-x-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0ms'}}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '200ms'}}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{animationDelay: '400ms'}}></div>
        </div>
      </div>
    </div>
  )
}