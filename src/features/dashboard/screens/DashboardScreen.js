import React from "react";
import { View, Text, StyleSheet } from 'react-native';

export default function DashboardScreen() {

    return (
        <View style={StyleSheet.container} testID='dashboard-screen'>
            <Text>Routing Test</Text>
        </View>
    );

}

const styles = StyleSheet.create({
    container:{
        flex:1,
        alignItems:'center',
        justifyContent:'center',
        padding:24,
    },
    title:{
        fontSize:22,
        fontWeight:'600',
        marginBottom:8,
    },
})