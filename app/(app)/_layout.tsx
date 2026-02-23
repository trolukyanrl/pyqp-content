import { Slot, Redirect, Stack } from 'expo-router'
import { useAuth } from '@/context/AuthContext'

export default function AppLayout(){
    const {session} = useAuth()
    
    if (!session) {
        return <Redirect  href="/signin"/>
    }
    
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="search" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="manage-exams" />
            <Stack.Screen name="exams" />
            <Stack.Screen name="manage-papers" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="manage-jobs" />
            <Stack.Screen name="job-alerts" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="manage-quizzes/add" />
        </Stack>
    )
}
